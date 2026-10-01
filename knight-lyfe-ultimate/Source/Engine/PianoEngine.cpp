#include "PianoEngine.h"
#include "KnightLyfeAssets.h"

#include <cstring>

namespace knightlyfe
{

//==============================================================================
PianoSamples::PianoSamples()
{
    startBackgroundLoad();
}

PianoSamples::~PianoSamples()
{
    stopLoading = true;
    if (loader.joinable())
        loader.join();
}

void PianoSamples::startBackgroundLoad()
{
    loader = std::thread ([this] { loadNow(); });
}

int PianoSamples::nearestSampleNote (int midiNote) noexcept
{
    const int clamped = juce::jlimit (firstNote, firstNote + (numNotes - 1) * 3, midiNote);
    return firstNote + ((clamped - firstNote + 1) / 3) * 3;
}

int PianoSamples::layerIndexFor (int velocity127) noexcept
{
    if (velocity127 <= 44) return 0;
    if (velocity127 <= 76) return 1;
    if (velocity127 <= 104) return 2;
    return 3;
}

const PianoSamples::Sample* PianoSamples::get (int midiNote, int velocity127) const noexcept
{
    if (! ready.load())
        return nullptr;

    const int index = (nearestSampleNote (midiNote) - firstNote) / 3;
    const auto& s = samples[(size_t) index][(size_t) layerIndexFor (velocity127)];
    return s.audio.getNumSamples() > 0 ? &s : nullptr;
}

/** "samples/salamander/Ds4v12.mp3" -> MIDI note 63, layer 12. */
static bool parseSampleName (const juce::String& path, int& note, int& layer)
{
    const auto name = path.fromLastOccurrenceOf ("/", false, false).upToLastOccurrenceOf (".", false, false);
    const int v = name.lastIndexOfChar ('v');
    if (v <= 0)
        return false;

    const auto pitch = name.substring (0, v);
    layer = name.substring (v + 1).getIntValue();

    static const std::pair<const char*, int> names[] { { "Ds", 3 }, { "Fs", 6 }, { "C", 0 }, { "A", 9 } };
    for (auto [prefix, pc] : names)
    {
        if (pitch.startsWith (prefix))
        {
            const auto octave = pitch.substring ((int) std::strlen (prefix));
            if (! octave.containsOnly ("0123456789"))
                return false;
            note = 12 * (octave.getIntValue() + 1) + pc;
            return true;
        }
    }
    return false;
}

int PianoSamples::loadNow()
{
    juce::AudioFormatManager formats;
    formats.registerBasicFormats();

    juce::ZipFile zip (std::make_unique<juce::MemoryInputStream> (KnightLyfeAssets::piano_zip,
                                                                  (size_t) KnightLyfeAssets::piano_zipSize, false));

    int count = 0;
    for (int i = 0; i < zip.getNumEntries() && ! stopLoading; ++i)
    {
        const auto* entry = zip.getEntry (i);
        int note = 0, layer = 0;
        if (entry == nullptr || ! parseSampleName (entry->filename, note, layer))
            continue;

        const auto layerIt = std::find (layers.begin(), layers.end(), layer);
        const int noteIndex = (note - firstNote) / 3;
        if (layerIt == layers.end() || noteIndex < 0 || noteIndex >= numNotes || (note - firstNote) % 3 != 0)
            continue;

        std::unique_ptr<juce::InputStream> stream (zip.createStreamForEntry (i));
        if (stream == nullptr)
            continue;

        // Read fully into memory first: MP3 readers like a seekable stream.
        juce::MemoryBlock data;
        stream->readIntoMemoryBlock (data);
        std::unique_ptr<juce::AudioFormatReader> reader (
            formats.createReaderFor (std::make_unique<juce::MemoryInputStream> (data, false)));
        if (reader == nullptr || reader->lengthInSamples <= 0)
            continue;

        auto& s = samples[(size_t) noteIndex][(size_t) std::distance (layers.begin(), layerIt)];
        const int length = (int) reader->lengthInSamples;
        s.audio.setSize (2, length);
        reader->read (&s.audio, 0, length, 0, true, true);
        s.sampleRate = reader->sampleRate;

        // Skip encoder padding so the hammer lands right away.
        int first = 0;
        const float* l = s.audio.getReadPointer (0);
        const float* r = s.audio.getReadPointer (1);
        while (first < length && std::abs (l[first]) < 0.0015f && std::abs (r[first]) < 0.0015f)
            ++first;
        s.start = juce::jmax (0, first - 16);

        ++count;
        loaded = count;
    }

    ready = count > 0;
    return count;
}

//==============================================================================
PianoVoice::PianoVoice (const PianoSamples& s, const ChannelGains& g, const int& ch)
    : samples (s), gains (g), noteOnChannel (ch)
{
}

void PianoVoice::startNote (int midiNote, float velocity, juce::SynthesiserSound*, int pitchWheel)
{
    const int vel = juce::jlimit (1, 127, juce::roundToInt (velocity * 127.0f));
    sample = samples.get (midiNote, vel);
    if (sample == nullptr)
    {
        clearCurrentNote();
        return;
    }

    channel = juce::jlimit (1, 16, noteOnChannel);
    const int base = PianoSamples::nearestSampleNote (midiNote);
    baseStep = std::pow (2.0, (midiNote - base) / 12.0) * sample->sampleRate / getSampleRate();
    pitchWheelMoved (pitchWheel);
    position = (double) sample->start;

    // The recorded layers carry the tone change; add a gentler level curve on top.
    const float v = (float) vel / 127.0f;
    level = 0.85f * (0.3f + 0.7f * std::pow (v, 1.3f));

    // Dampers: bass strings ring a little longer after the key comes up.
    const float release = 0.25f * juce::jlimit (0.5f, 2.5f, std::pow (2.0f, (60.0f - (float) midiNote) / 24.0f));
    envelope.setSampleRate (getSampleRate());
    envelope.setParameters ({ 0.0015f, 0.0f, 1.0f, release });
    envelope.reset();
    envelope.noteOn();
}

void PianoVoice::stopNote (float, bool allowTailOff)
{
    if (allowTailOff)
    {
        envelope.noteOff();
    }
    else
    {
        envelope.reset();
        sample = nullptr;
        clearCurrentNote();
    }
}

void PianoVoice::pitchWheelMoved (int value)
{
    const double semitones = 2.0 * (value - 8192) / 8192.0;
    bend = std::pow (2.0, semitones / 12.0);
    updateStep();
}

void PianoVoice::updateStep()
{
    step = baseStep * bend;
}

void PianoVoice::renderNextBlock (juce::AudioBuffer<float>& out, int startSample, int numSamples)
{
    if (sample == nullptr || ! isVoiceActive())
        return;

    const auto& audio = sample->audio;
    const int length = audio.getNumSamples();
    const float* l = audio.getReadPointer (0);
    const float* r = audio.getReadPointer (1);
    const float gain = level * gains[(size_t) channel].load (std::memory_order_relaxed);
    float* outL = out.getWritePointer (0);
    float* outR = out.getNumChannels() > 1 ? out.getWritePointer (1) : nullptr;

    for (int i = 0; i < numSamples; ++i)
    {
        const int p = (int) position;
        if (p + 1 >= length || ! envelope.isActive())
        {
            sample = nullptr;
            clearCurrentNote();
            return;
        }

        const float frac = (float) (position - p);
        const float env = envelope.getNextSample() * gain;
        const float sl = (l[p] + frac * (l[p + 1] - l[p])) * env;
        const float sr = (r[p] + frac * (r[p + 1] - r[p])) * env;
        outL[startSample + i] += sl;
        if (outR != nullptr)
            outR[startSample + i] += sr;
        position += step;
    }
}

//==============================================================================
PianoSynth::PianoSynth (const PianoSamples& samples, const ChannelGains& gains, int numVoices)
{
    for (int i = 0; i < numVoices; ++i)
        addVoice (new PianoVoice (samples, gains, noteOnChannel));
    addSound (new PianoSound());
}

} // namespace knightlyfe
