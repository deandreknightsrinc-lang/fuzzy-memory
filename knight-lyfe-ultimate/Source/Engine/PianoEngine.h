#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_formats/juce_audio_formats.h>

#include <array>
#include <atomic>
#include <thread>

namespace knightlyfe
{

/** The Salamander Grand Piano samples: every minor third from A0 to C8, in four
    velocity layers. Decoded once and shared by every plug-in instance. */
class PianoSamples
{
public:
    static constexpr int numNotes = 30;      // A0 (21) .. C8 (108), step 3
    static constexpr int firstNote = 21;
    static constexpr std::array<int, 4> layers { 4, 8, 12, 16 };

    struct Sample
    {
        juce::AudioBuffer<float> audio;
        double sampleRate = 44100.0;
        int start = 0; // first audible sample (MP3 encoders add silence at the front)
    };

    /** Starts decoding on a background thread (used by the plug-in). */
    PianoSamples();
    ~PianoSamples();

    /** Decodes everything on the calling thread. Returns the number of samples loaded. */
    int loadNow();

    bool isReady() const noexcept { return ready.load(); }
    int getNumLoaded() const noexcept { return loaded.load(); }

    /** Nearest recorded note (within a semitone and a half). */
    static int nearestSampleNote (int midiNote) noexcept;
    /** Velocity layer index (0..3) for a MIDI velocity. */
    static int layerIndexFor (int velocity127) noexcept;

    const Sample* get (int midiNote, int velocity127) const noexcept;

private:
    void startBackgroundLoad();

    std::array<std::array<Sample, layers.size()>, numNotes> samples;
    std::atomic<bool> ready { false };
    std::atomic<int> loaded { 0 };
    std::atomic<bool> stopLoading { false };
    std::thread loader;

    JUCE_DECLARE_NON_COPYABLE (PianoSamples)
};

/** Per-MIDI-channel gains read by voices while they play (index 1..16). */
using ChannelGains = std::array<std::atomic<float>, 17>;

class PianoSound final : public juce::SynthesiserSound
{
public:
    bool appliesToNote (int) override { return true; }
    bool appliesToChannel (int) override { return true; }
};

class PianoVoice final : public juce::SynthesiserVoice
{
public:
    PianoVoice (const PianoSamples& samples, const ChannelGains& gains, const int& noteOnChannel);

    bool canPlaySound (juce::SynthesiserSound* s) override { return dynamic_cast<PianoSound*> (s) != nullptr; }
    void startNote (int midiNote, float velocity, juce::SynthesiserSound*, int pitchWheel) override;
    void stopNote (float velocity, bool allowTailOff) override;
    void pitchWheelMoved (int value) override;
    void controllerMoved (int, int) override {}
    void renderNextBlock (juce::AudioBuffer<float>& out, int startSample, int numSamples) override;
    using juce::SynthesiserVoice::renderNextBlock;

private:
    void updateStep();

    const PianoSamples& samples;
    const ChannelGains& gains;
    const int& noteOnChannel;

    const PianoSamples::Sample* sample = nullptr;
    int channel = 1;
    double position = 0.0, baseStep = 1.0, bend = 1.0, step = 1.0;
    float level = 0.0f;
    juce::ADSR envelope;
};

/** A juce::Synthesiser of PianoVoices that remembers which channel each note came from. */
class PianoSynth final : public juce::Synthesiser
{
public:
    PianoSynth (const PianoSamples& samples, const ChannelGains& gains, int numVoices = 64);

    void noteOn (int midiChannel, int midiNoteNumber, float velocity) override
    {
        noteOnChannel = midiChannel;
        juce::Synthesiser::noteOn (midiChannel, midiNoteNumber, velocity);
    }

private:
    int noteOnChannel = 1;
};

} // namespace knightlyfe
