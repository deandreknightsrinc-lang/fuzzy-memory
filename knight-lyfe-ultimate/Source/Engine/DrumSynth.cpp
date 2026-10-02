#include "DrumSynth.h"

namespace knightlyfe
{

DrumSynth::DrumSynth()
{
    for (int n = 0; n < 128; ++n)
    {
        pieceTune[(size_t) n] = 0.0f;
        pieceDecay[(size_t) n] = 1.0f;
        pieceLevel[(size_t) n] = 1.0f;
        pieceSample[(size_t) n] = nullptr;
    }
}

void DrumSynth::setPiece (int note, float tuneSemitones, float decay, float level) noexcept
{
    if (note < 0 || note > 127)
        return;
    pieceTune[(size_t) note] = juce::jlimit (-24.0f, 24.0f, tuneSemitones);
    pieceDecay[(size_t) note] = juce::jlimit (0.1f, 4.0f, decay);
    pieceLevel[(size_t) note] = juce::jlimit (0.0f, 2.0f, level);
}

void DrumSynth::setSample (int note, const Sample* sample) noexcept
{
    if (note >= 0 && note <= 127)
        pieceSample[(size_t) note] = sample;
}

void DrumSynth::prepare (double sr)
{
    sampleRate = sr;
    for (auto& h : hits)
        h.active = false;
}

DrumSynth::Hit* DrumSynth::freeHit()
{
    Hit* oldest = &hits[0];
    for (auto& h : hits)
    {
        if (! h.active)
            return &h;
        if (h.age > oldest->age)
            oldest = &h;
    }
    return oldest; // steal the oldest hit
}

/** Per-sample multiplier for an exponential decay with the given time constant. */
float DrumSynth::coeffFor (float seconds) const
{
    return seconds <= 0.0f ? 0.0f : std::exp (-1.0f / (seconds * (float) sampleRate));
}

static float onePoleCoeff (float hz, double sampleRate)
{
    return 1.0f - std::exp (-juce::MathConstants<float>::twoPi * hz / (float) sampleRate);
}

void DrumSynth::trigger (int note, int velocity127, float gain, int offset)
{
    if (note == 42 || note == 44 || note == 22) // a closed or pedal hat chokes ringing open hats
        for (auto& h : hits)
            if (h.active && h.openHat && h.delay <= offset)
                h.length = juce::jmin (h.length, h.age + (offset - h.delay) + (int) (0.01 * sampleRate));

    const bool inRange = note >= 0 && note <= 127;
    const float ratio = inRange ? std::pow (2.0f, pieceTune[(size_t) note].load() / 12.0f) : 1.0f;
    const float d = inRange ? pieceDecay[(size_t) note].load() : 1.0f;
    const float level = inRange ? pieceLevel[(size_t) note].load() : 1.0f;

    auto& h = *freeHit();
    h = Hit {};
    h.active = true;
    h.delay = juce::jmax (0, offset);
    h.amp = 0.6f * std::pow ((float) velocity127 / 127.0f, 1.2f) * gain * level; // leaves headroom for the piano
    h.pan = 0.5f;

    if (const auto* smp = inRange ? pieceSample[(size_t) note].load() : nullptr; smp != nullptr && smp->audio.getNumSamples() > 1)
    {
        h.sample = smp;
        h.step = smp->sampleRate / sampleRate * ratio;
        const double full = (smp->audio.getNumSamples() - 1) / h.step;
        h.length = (int) juce::jmin (full, full * d); // decay below 1 shortens the sample
        h.sampleEnd = h.length;
        if (note == 46 || note == 26)
            h.openHat = true;
        return;
    }

    auto seconds = [this, d] (float s) { return (int) (s * d * sampleRate); };
    auto tone = [&] (float a, float b, float lvl, float decay, float sweepTime = 0.06f) {
        h.f0 = a * ratio; h.f1 = b * ratio; h.toneLevel = lvl; h.toneDecay = coeffFor (decay * d);
        h.sweep = coeffFor (sweepTime * d);
    };
    auto noise = [&] (float lvl, float decay, float hpHz, float lpHz) {
        const float nyquistSafe = 0.45f * (float) sampleRate;
        h.noiseLevel = lvl; h.noiseDecay = coeffFor (decay * d);
        h.hp = hpHz > 0 ? onePoleCoeff (juce::jmin (hpHz * ratio, nyquistSafe), sampleRate) : 0.0f;
        h.lp = lpHz > 0 ? onePoleCoeff (juce::jmin (lpHz * ratio, nyquistSafe), sampleRate) : 1.0f;
    };

    static const std::array<std::pair<int, float>, 7> toms { { { 58, 80.f }, { 41, 80.f }, { 43, 100.f }, { 45, 120.f }, { 47, 145.f }, { 48, 170.f }, { 50, 200.f } } };

    switch (note)
    {
        case 35: case 36:
            tone (160.f, 45.f, 1.4f, 0.12f, 0.05f);
            noise (0.3f, 0.004f, 0.f, 1200.f);
            h.length = seconds (0.5f);
            break;
        case 37:
            noise (0.9f, 0.012f, 1500.f, 3500.f);
            tone (1700.f, 1700.f, 0.15f, 0.01f);
            h.length = seconds (0.08f);
            break;
        case 38: case 40:
            tone (220.f, 160.f, 0.6f, 0.04f);
            noise (0.8f, 0.07f, 1500.f, 0.f);
            h.length = seconds (0.3f);
            break;
        case 39:
            noise (0.9f, 0.05f, 900.f, 2500.f);
            h.bursts = 3;
            h.length = seconds (0.25f);
            break;
        case 42: case 44: case 22: // 22: closed hat edge on Alesis kits
            noise (0.5f, 0.015f, 7500.f, 0.f);
            h.length = seconds (0.08f);
            h.pan = 0.65f;
            break;
        case 46: case 26: // 26: open hat edge on Alesis kits
            noise (0.45f, 0.12f, 7000.f, 0.f);
            h.length = seconds (0.6f);
            h.openHat = true;
            h.pan = 0.65f;
            break;
        case 49: case 52: case 55: case 57:
            noise (0.45f, 0.5f, 5000.f, 0.f);
            h.length = seconds (2.2f);
            h.pan = 0.35f;
            break;
        case 51: case 53: case 59:
            noise (0.35f, 0.3f, 8000.f, 0.f);
            tone (note == 53 ? 1300.f : 900.f, note == 53 ? 1300.f : 900.f, 0.08f, 0.3f);
            h.length = seconds (1.2f);
            h.pan = 0.7f;
            break;
        case 54:
            noise (0.5f, 0.05f, 9000.f, 0.f);
            h.length = seconds (0.2f);
            h.pan = 0.6f;
            break;
        case 56:
            tone (560.f, 560.f, 0.15f, 0.06f);
            h.square = true;
            h.f2 = 845.f * ratio;
            h.length = seconds (0.3f);
            break;
        default:
        {
            bool isTom = false;
            for (auto [n, f] : toms)
            {
                if (n == note)
                {
                    tone (f * 1.6f, f, 1.0f, 0.12f, 0.08f);
                    h.pan = 0.3f + 0.4f * (float) (juce::jlimit (41, 50, note) - 41) / 9.0f;
                    h.length = seconds (0.5f);
                    isTom = true;
                }
            }
            if (! isTom)
            {
                noise (0.6f, 0.03f, 400.f, 2400.f);
                h.length = seconds (0.12f);
            }
        }
    }
}

void DrumSynth::stopAll()
{
    for (auto& h : hits)
    {
        if (! h.active)
            continue;
        if (h.delay > 0)
            h.active = false; // not started yet
        else
            h.length = juce::jmin (h.length, h.age + (int) (0.01 * sampleRate));
    }
}

void DrumSynth::render (juce::AudioBuffer<float>& out, int startSample, int numSamples)
{
    float* outL = out.getWritePointer (0);
    float* outR = out.getNumChannels() > 1 ? out.getWritePointer (1) : nullptr;
    const float twoPiOverSr = juce::MathConstants<float>::twoPi / (float) sampleRate;

    for (auto& h : hits)
    {
        if (! h.active)
            continue;
        if (h.sample != nullptr)
        {
            renderSample (h, outL, outR, startSample, numSamples);
            continue;
        }

        for (int i = 0; i < numSamples; ++i)
        {
            if (h.delay > 0)
            {
                --h.delay;
                continue;
            }
            if (h.age >= h.length)
            {
                h.active = false;
                break;
            }

            float s = 0.0f;
            if (h.toneLevel > 0.0f)
            {
                const float f = h.f1 + (h.f0 - h.f1) * h.sweepEnv;
                h.sweepEnv *= h.sweep;
                h.phase += f * twoPiOverSr;
                if (h.phase > juce::MathConstants<float>::twoPi)
                    h.phase -= juce::MathConstants<float>::twoPi;
                float osc = h.square ? (h.phase < juce::MathConstants<float>::pi ? 1.0f : -1.0f) : std::sin (h.phase);
                if (h.f2 > 0.0f)
                {
                    h.phase2 += h.f2 * twoPiOverSr;
                    if (h.phase2 > juce::MathConstants<float>::twoPi)
                        h.phase2 -= juce::MathConstants<float>::twoPi;
                    osc += h.phase2 < juce::MathConstants<float>::pi ? 1.0f : -1.0f;
                }
                s += osc * h.toneLevel * h.toneEnv;
                h.toneEnv *= h.toneDecay;
            }
            if (h.noiseLevel > 0.0f)
            {
                float n = random.nextFloat() * 2.0f - 1.0f;
                if (h.hp > 0.0f) // one-pole high-pass
                {
                    h.hpState += h.hp * (n - h.hpState);
                    n -= h.hpState;
                }
                h.lpState += h.lp * (n - h.lpState); // one-pole low-pass
                float env = h.noiseEnv;
                h.noiseEnv *= h.noiseDecay;
                if (h.bursts > 0) // clap: a few quick re-triggers (rare, so pow is fine here)
                {
                    const int burstLen = (int) (0.01 * sampleRate);
                    if (h.age < burstLen * h.bursts)
                        env = std::pow (h.noiseDecay, (float) (h.age % burstLen) * 3.0f);
                    else
                        env = std::pow (h.noiseDecay, (float) (h.age - burstLen * h.bursts));
                }
                s += h.lpState * h.noiseLevel * env;
            }

            // Short fade at the end to avoid clicks.
            const int remaining = h.length - h.age;
            const float fade = remaining < 64 ? (float) remaining / 64.0f : 1.0f;
            s *= h.amp * fade;

            outL[startSample + i] += s * std::sqrt (1.0f - h.pan) * 1.41f;
            if (outR != nullptr)
                outR[startSample + i] += s * std::sqrt (h.pan) * 1.41f;
            ++h.age;
        }
    }
}

void DrumSynth::renderSample (Hit& h, float* outL, float* outR, int startSample, int numSamples)
{
    const auto& audio = h.sample->audio;
    const float* srcL = audio.getReadPointer (0);
    const float* srcR = audio.getReadPointer (audio.getNumChannels() > 1 ? 1 : 0);
    const int last = audio.getNumSamples() - 1;
    const int fadeLen = juce::jmax (64, h.sampleEnd / 5); // gentle tail when decay shortens it

    for (int i = 0; i < numSamples; ++i)
    {
        if (h.delay > 0)
        {
            --h.delay;
            continue;
        }
        const int idx = (int) h.pos;
        if (h.age >= h.length || idx >= last)
        {
            h.active = false;
            break;
        }
        const float frac = (float) (h.pos - idx);
        const float l = srcL[idx] + (srcL[idx + 1] - srcL[idx]) * frac;
        const float r = srcR[idx] + (srcR[idx + 1] - srcR[idx]) * frac;
        // Tail fade, plus a quick 64-sample fade when a closed hat chokes it.
        const float tail = juce::jmin (1.0f, (float) (h.sampleEnd - h.age) / (float) fadeLen);
        const float choke = juce::jmin (1.0f, (float) (h.length - h.age) / 64.0f);
        const float fade = tail * choke;
        outL[startSample + i] += l * h.amp * fade;
        if (outR != nullptr)
            outR[startSample + i] += r * h.amp * fade;
        h.pos += h.step;
        ++h.age;
    }
}

} // namespace knightlyfe
