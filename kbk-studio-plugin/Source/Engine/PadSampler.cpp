#include "PadSampler.h"

#include <cmath>

namespace kbk
{
float velocityGain (int velocity, bool sensitive)
{
    if (! sensitive)
        return 1.0f;
    const float v = (float) juce::jlimit (1, 127, velocity) / 127.0f;
    return std::pow (v, 1.6f) * 0.9f + 0.1f;
}

PadSampler::PadSampler()
{
    setBaseNote (36);
    for (int i = 0; i < numPads; ++i)
        uiNote[(size_t) i] = 1000 + i;
}

void PadSampler::prepare (double sr, int maxBlock)
{
    sampleRate = sr;
    juce::dsp::ProcessSpec spec { sr, (juce::uint32) juce::jmax (1, maxBlock), 2 };
    limiter.prepare (spec);
    neural.prepare (sr, juce::jmax (1, maxBlock));
    limiter.reset();
    masterGain.reset (sr, 0.02);
    masterGain.setCurrentAndTargetValue (juce::Decibels::decibelsToGain (master.masterDb));
    compEnv = 0.0f;
    for (auto& v : voices)
        v.active = false;
}

// ---- pads -----------------------------------------------------------------

Pad PadSampler::getPad (int i) const
{
    const juce::SpinLock::ScopedLockType sl (lock);
    return pads[(size_t) i];
}

void PadSampler::setPad (int i, const Pad& p)
{
    std::shared_ptr<const juce::AudioBuffer<float>> old;
    {
        const juce::SpinLock::ScopedLockType sl (lock);
        old = pads[(size_t) i].audio; // freed here, on the message thread, not in the audio callback
        if (old != p.audio)
            for (auto& v : voices)
                if (v.active && v.pad == i)
                    release (v, 0.01f);
        pads[(size_t) i] = p;
    }
}

void PadSampler::stopPad (int i)
{
    const juce::SpinLock::ScopedLockType sl (lock);
    for (auto& v : voices)
        if (v.active && v.pad == i)
            release (v, 0.02f);
}

void PadSampler::stopAll()
{
    const juce::SpinLock::ScopedLockType sl (lock);
    for (auto& v : voices)
        if (v.active)
            release (v, 0.02f);
}

std::array<int, numPads> PadSampler::getPadNotes() const
{
    const juce::SpinLock::ScopedLockType sl (lock);
    return padNotes;
}

void PadSampler::setPadNotes (const std::array<int, numPads>& notes)
{
    const juce::SpinLock::ScopedLockType sl (lock);
    padNotes = notes;
}

void PadSampler::setBaseNote (int note)
{
    std::array<int, numPads> n {};
    for (int i = 0; i < numPads; ++i)
        n[(size_t) i] = juce::jlimit (0, 127, note + i);
    setPadNotes (n);
}

void PadSampler::queueHit (int pad, float velocity, bool on)
{
    int s1, n1, s2, n2;
    hitFifo.prepareToWrite (1, s1, n1, s2, n2);
    if (n1 > 0)
        hitQueue[(size_t) s1] = { pad, velocity, on };
    else if (n2 > 0)
        hitQueue[(size_t) s2] = { pad, velocity, on };
    hitFifo.finishedWrite (n1 + n2);
}

void PadSampler::setMaster (const MasterSettings& m)
{
    const juce::SpinLock::ScopedLockType sl (masterLock);
    masterLive = m;
}

// ---- voices -----------------------------------------------------------------

void PadSampler::release (Voice& v, float seconds)
{
    if (! v.active || v.releasing)
        return;
    v.releasing = true;
    v.envStep = -1.0f / juce::jmax (1.0f, seconds * (float) sampleRate);
}

void PadSampler::startVoice (int padIndex, float velGain, double pitchRate, int note, bool chromatic)
{
    const Pad& p = pads[(size_t) padIndex];
    hits[(size_t) padIndex].fetch_add (1);
    if (! p.loaded())
        return;

    if (p.choke > 0)
        for (auto& v : voices)
            if (v.active && v.pad >= 0 && pads[(size_t) v.pad].choke == p.choke)
                release (v, 0.008f);

    // free voice, or steal the oldest
    Voice* slot = nullptr;
    for (auto& v : voices)
        if (! v.active)
        {
            slot = &v;
            break;
        }
    if (slot == nullptr)
    {
        slot = &voices[0];
        for (auto& v : voices)
            if (v.age < slot->age)
                slot = &v;
    }

    Voice& v = *slot;
    const int n = p.audio->getNumSamples();
    const float s0 = juce::jmin (p.start, p.end), s1 = juce::jmax (p.start, p.end);
    v.first = juce::jlimit (0, n - 1, (int) (s0 * n));
    v.last = juce::jlimit (v.first + 1, n, (int) (s1 * n));
    v.active = true;
    v.pad = padIndex;
    v.note = note;
    v.audio = p.audio;
    v.pos = 0.0;
    v.baseRate = pitchRate * (p.sourceRate / sampleRate) * std::pow (2.0, p.tune / 12.0);
    v.rate = v.baseRate * (chromatic ? std::pow (2.0, bendSemis / 12.0) : 1.0);
    v.chromatic = chromatic;
    v.loop = p.mode == PlayMode::Loop;
    v.mode = p.mode;
    v.reverse = p.reverse;
    const float g = p.gain * velGain;
    const float angle = (p.pan + 1.0f) * juce::MathConstants<float>::pi * 0.25f;
    v.gainL = g * std::cos (angle) * juce::MathConstants<float>::sqrt2;
    v.gainR = g * std::sin (angle) * juce::MathConstants<float>::sqrt2;
    v.env = 0.0f;
    v.envStep = 1.0f / juce::jmax (1.0f, 0.001f * (float) sampleRate); // 1 ms fade in
    v.releasing = false;
    v.held = true;
    v.sustained = false;
    v.age = ++voiceCounter;
}

void PadSampler::noteOn (int note, int velocity)
{
    lastNote = note;
    lastVelocity = velocity;
    const int learn = learnPad.load();
    if (learn != -1)
    {
        learnedNote = note;
        learnPad = -1;
        return;
    }
    const auto mode = (KeyMode) keyMode.load();
    int pad = -1;
    for (int i = 0; i < numPads; ++i)
        if (padNotes[(size_t) i] == note)
            pad = i;
    const float vg = velocityGain (velocity, velocitySensitive.load());
    if (mode == KeyMode::Pads || (mode == KeyMode::Split && pad >= 0))
    {
        if (pad >= 0)
            startVoice (pad, vg, 1.0, note, false);
        return;
    }
    if (mode == KeyMode::Split)
    {
        int top = 0;
        for (auto n : padNotes)
            top = juce::jmax (top, n);
        if (note <= top)
            return;
    }
    startVoice (juce::jlimit (0, numPads - 1, selectedPad.load()), vg, std::pow (2.0, (note - rootNote.load()) / 12.0), note, true);
}

void PadSampler::noteOff (int note)
{
    for (auto& v : voices)
    {
        if (! v.active || v.note != note || ! v.held)
            continue;
        v.held = false;
        if (v.mode == PlayMode::OneShot)
            continue;
        if (sustain)
            v.sustained = true;
        else
            release (v, 0.03f);
    }
}

void PadSampler::renderVoice (Voice& v, float* L, float* R, int n)
{
    const auto& a = *v.audio;
    const float* c0 = a.getReadPointer (0);
    const float* c1 = a.getReadPointer (a.getNumChannels() > 1 ? 1 : 0);
    const int len = v.last - v.first;
    for (int i = 0; i < n; ++i)
    {
        if (v.pos >= len)
        {
            if (v.loop)
                v.pos = std::fmod (v.pos, (double) len);
            else
            {
                v.active = false;
                break;
            }
        }
        const int ip = (int) v.pos;
        const float t = (float) (v.pos - ip);
        int i0 = ip, i1 = juce::jmin (ip + 1, len - 1);
        if (v.reverse)
        {
            i0 = len - 1 - i0;
            i1 = len - 1 - i1;
        }
        i0 += v.first;
        i1 += v.first;
        const float l = c0[i0] + (c0[i1] - c0[i0]) * t;
        const float r = c1[i0] + (c1[i1] - c1[i0]) * t;

        v.env += v.envStep;
        if (v.env >= 1.0f && ! v.releasing)
        {
            v.env = 1.0f;
            v.envStep = 0.0f;
        }
        if (v.env <= 0.0f && v.releasing)
        {
            v.active = false;
            break;
        }
        L[i] += l * v.gainL * v.env;
        R[i] += r * v.gainR * v.env;
        v.pos += v.rate;
    }
    if (! v.active)
        v.audio.reset();
}

void PadSampler::render (juce::AudioBuffer<float>& out, const juce::MidiBuffer& midi)
{
    out.clear();
    const int n = out.getNumSamples();
    if (out.getNumChannels() < 1 || n == 0)
        return;
    float* L = out.getWritePointer (0);
    float* R = out.getWritePointer (out.getNumChannels() > 1 ? 1 : 0);

    const juce::SpinLock::ScopedTryLockType sl (lock);
    if (sl.isLocked())
    {
        // pads clicked in the interface
        int s1, n1, s2, n2;
        hitFifo.prepareToRead (hitFifo.getNumReady(), s1, n1, s2, n2);
        auto doHit = [this] (const Hit& h)
        {
            if (h.on)
                startVoice (h.pad, h.velocity, 1.0, uiNote[(size_t) h.pad], false);
            else
                noteOff (uiNote[(size_t) h.pad]);
        };
        for (int k = 0; k < n1; ++k)
            doHit (hitQueue[(size_t) (s1 + k)]);
        for (int k = 0; k < n2; ++k)
            doHit (hitQueue[(size_t) (s2 + k)]);
        hitFifo.finishedRead (n1 + n2);

        int pos = 0;
        auto renderTo = [&] (int until)
        {
            if (until <= pos)
                return;
            for (auto& v : voices)
                if (v.active)
                    renderVoice (v, L + pos, R + pos, until - pos);
            pos = until;
        };
        for (const auto meta : midi)
        {
            const auto m = meta.getMessage();
            renderTo (juce::jlimit (0, n, meta.samplePosition));
            if (m.isNoteOn())
                noteOn (m.getNoteNumber(), m.getVelocity());
            else if (m.isNoteOff())
                noteOff (m.getNoteNumber());
            else if (m.isSustainPedalOn())
                sustain = true;
            else if (m.isSustainPedalOff())
            {
                sustain = false;
                for (auto& v : voices)
                    if (v.active && v.sustained && ! v.held)
                        release (v, 0.03f);
            }
            else if (m.isPitchWheel())
            {
                bendSemis = (float) (m.getPitchWheelValue() - 8192) / 8192.0f * 2.0f;
                for (auto& v : voices)
                    if (v.active && v.chromatic)
                        v.rate = v.baseRate * std::pow (2.0, bendSemis / 12.0);
            }
            else if (m.isAllNotesOff() || m.isAllSoundOff())
                for (auto& v : voices)
                    if (v.active)
                        release (v, 0.02f);
        }
        renderTo (n);
    }
    if (out.getNumChannels() > 1 && R == L)
        out.copyFrom (1, 0, out, 0, 0, n);
    applyMaster (out);
}

// ---- master bus ---------------------------------------------------------------

void PadSampler::applyMaster (juce::AudioBuffer<float>& out)
{
    {
        const juce::SpinLock::ScopedTryLockType sl (masterLock);
        if (sl.isLocked())
            master = masterLive;
    }
    const int n = out.getNumSamples();
    const int chans = juce::jmin (2, out.getNumChannels());
    float* L = out.getWritePointer (0);
    float* R = out.getWritePointer (chans > 1 ? 1 : 0);
    const float sr = (float) sampleRate;

    neural.process (L, R, n, master.neural);

    if (master.glueOn)
    {
        // stereo-linked feed-forward compressor
        const float att = std::exp (-1.0f / (0.001f * juce::jmax (0.1f, master.glueAttackMs) * sr));
        const float rel = std::exp (-1.0f / (0.001f * juce::jmax (1.0f, master.glueReleaseMs) * sr));
        const float makeup = juce::Decibels::decibelsToGain (master.glueMakeupDb);
        const float slope = 1.0f - 1.0f / juce::jmax (1.0f, master.glueRatio);
        for (int i = 0; i < n; ++i)
        {
            const float x = juce::jmax (std::abs (L[i]), std::abs (R[i]));
            const float c = x > compEnv ? att : rel;
            compEnv = c * compEnv + (1.0f - c) * x;
            const float db = juce::Decibels::gainToDecibels (compEnv, -120.0f);
            const float over = db - master.glueThreshDb;
            const float g = over > 0.0f ? juce::Decibels::decibelsToGain (-over * slope) : 1.0f;
            const float w = master.glueMix;
            const float k = (1.0f - w) + w * g * makeup;
            L[i] *= k;
            if (R != L)
                R[i] *= k;
        }
    }
    if (master.tapeOn)
    {
        const float drive = 1.0f + master.tapeDrive * 6.0f;
        const float norm = 1.0f / std::tanh (drive);
        const float cutoff = 18000.0f - master.tapeWarmth * 13000.0f; // warmth rolls off the top
        const float a = 1.0f - std::exp (-2.0f * juce::MathConstants<float>::pi * cutoff / sr);
        for (int i = 0; i < n; ++i)
        {
            float l = std::tanh (L[i] * drive) * norm;
            warmthL += a * (l - warmthL);
            L[i] = warmthL;
            if (R != L)
            {
                float r = std::tanh (R[i] * drive) * norm;
                warmthR += a * (r - warmthR);
                R[i] = warmthR;
            }
        }
    }
    masterGain.setTargetValue (juce::Decibels::decibelsToGain (master.masterDb));
    for (int i = 0; i < n; ++i)
    {
        const float g = masterGain.getNextValue();
        L[i] *= g;
        if (R != L)
            R[i] *= g;
    }
    if (master.limiterOn)
    {
        limiter.setThreshold (master.limiterCeilingDb);
        limiter.setRelease (juce::jmax (1.0f, master.limiterReleaseMs));
        juce::dsp::AudioBlock<float> block (out);
        auto sub = block.getSubsetChannelBlock (0, (size_t) chans);
        limiter.process (juce::dsp::ProcessContextReplacing<float> (sub));
    }
    float pk = 0.0f;
    for (int c = 0; c < chans; ++c)
        pk = juce::jmax (pk, out.getMagnitude (c, 0, n));
    outputPeak = juce::jmax (pk, outputPeak.load() * 0.9f);
}
} // namespace kbk
