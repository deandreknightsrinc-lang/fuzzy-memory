#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <array>
#include <atomic>
#include <memory>

#include "NeuralTone.h"

// The sound of KBK Studio: 16 sample pads played by MIDI, through a master
// bus with glue compressor, tape saturation and a limiter. No GUI code here,
// so the tests can drive it offline.
namespace kbk
{
constexpr int numPads = 16;

enum class PlayMode { OneShot = 0, Gate = 1, Loop = 2 };
enum class KeyMode { Pads = 0, Keys = 1, Split = 2 };

struct Pad
{
    std::shared_ptr<const juce::AudioBuffer<float>> audio; // never changed once shared
    double sourceRate = 44100.0;
    juce::String name;
    float gain = 0.8f;   // 0..1.5
    float tune = 0.0f;   // semitones
    float pan = 0.0f;    // -1..1
    float start = 0.0f;  // 0..1 of the sample
    float end = 1.0f;
    PlayMode mode = PlayMode::OneShot;
    bool reverse = false;
    int choke = 0;       // 0 = off, 1-4 = group
    double bpm = 0.0;    // tempo of the song it was chopped from (0 = unknown)
    bool loaded() const { return audio != nullptr && audio->getNumSamples() > 0; }
    double seconds() const { return loaded() ? audio->getNumSamples() / sourceRate : 0.0; }
};

struct MasterSettings
{
    NeuralSettings neural;
    float masterDb = 0.0f;
    bool glueOn = true;
    float glueThreshDb = 0.0f, glueRatio = 2.0f, glueAttackMs = 10.0f, glueReleaseMs = 120.0f, glueMakeupDb = 0.0f, glueMix = 1.0f;
    bool tapeOn = false;
    float tapeDrive = 0.3f, tapeWarmth = 0.4f;
    bool limiterOn = true;
    float limiterCeilingDb = -0.3f, limiterReleaseMs = 100.0f;
};

class PadSampler
{
public:
    PadSampler();

    void prepare (double sampleRate, int maxBlock);
    // Renders into a stereo buffer (cleared first) and handles the MIDI.
    void render (juce::AudioBuffer<float>& out, const juce::MidiBuffer& midi);

    // ---- pads (call from the message thread) ----
    Pad getPad (int i) const;
    void setPad (int i, const Pad& p);
    void stopPad (int i);
    void stopAll();

    // ---- keyboard routing ----
    std::array<int, numPads> getPadNotes() const;
    void setPadNotes (const std::array<int, numPads>& notes);
    void setBaseNote (int note);
    std::atomic<int> keyMode { (int) KeyMode::Pads };
    std::atomic<int> selectedPad { 0 };
    std::atomic<bool> velocitySensitive { true };
    std::atomic<int> rootNote { 60 };

    // MIDI learn: set a pad (or -2 for "pad 1 / base note"); the next note-on
    // is stored in learnedNote and the pad does not sound.
    std::atomic<int> learnPad { -1 };
    std::atomic<int> learnedNote { -1 };

    // The interface clicks a pad: queued and played on the audio thread.
    void queueHit (int pad, float velocity, bool on);

    // Counts each time a pad sounds, so the interface can flash it.
    std::array<std::atomic<uint32_t>, numPads> hits {};
    std::atomic<int> lastNote { -1 }, lastVelocity { 0 };
    std::atomic<float> outputPeak { 0.0f };

    void setMaster (const MasterSettings& m);
    // samples of delay the limiter adds (report it to the host)
    int latencySamples() const { return limLength; }

    // Neural Tone (amp model) on the master bus, before the glue compressor
    NeuralTone neural;

    // Record "Pads (dry)": a copy of the pads before the master effects
    std::atomic<bool> tapDry { false };
    juce::AudioBuffer<float> dry;

private:
    struct Voice
    {
        bool active = false;
        int pad = -1, note = -1;
        std::shared_ptr<const juce::AudioBuffer<float>> audio;
        double pos = 0.0, rate = 1.0, baseRate = 1.0;
        int first = 0, last = 0; // sample range [first, last)
        bool loop = false, reverse = false, chromatic = false;
        float gainL = 1.0f, gainR = 1.0f;
        float env = 0.0f, envStep = 0.0f; // fade in / out
        bool releasing = false, held = true, sustained = false;
        PlayMode mode = PlayMode::OneShot;
        uint64_t age = 0;
    };

    void noteOn (int note, int velocity);
    void noteOff (int note);
    void startVoice (int pad, float velGain, double pitchRate, int note, bool chromatic);
    void release (Voice& v, float seconds);
    void renderVoice (Voice& v, float* L, float* R, int n);
    void applyMaster (juce::AudioBuffer<float>& out);

    double sampleRate = 44100.0;
    mutable juce::SpinLock lock;
    std::array<Pad, numPads> pads;
    std::array<int, numPads> padNotes {};
    std::array<Voice, 64> voices;
    uint64_t voiceCounter = 0;
    bool sustain = false;
    float bendSemis = 0.0f;

    struct Hit { int pad; float velocity; bool on; };
    juce::AbstractFifo hitFifo { 64 };
    std::array<Hit, 64> hitQueue {};
    std::array<int, numPads> uiNote {}; // fake note numbers for interface hits

    // master
    juce::SpinLock masterLock;
    MasterSettings master, masterLive;
    float compEnv = 0.0f;
    float warmthL = 0.0f, warmthR = 0.0f;
    // brick-wall limiter: looks 1.5 ms ahead so nothing passes the ceiling,
    // and leaves everything below the ceiling untouched
    std::vector<float> limDelayL, limDelayR, limTarget;
    int limPos = 0, limLength = 1;
    float limGain = 1.0f;
    juce::LinearSmoothedValue<float> masterGain;
};

// Gain for a velocity: light hits stay audible, hard hits reach full level.
float velocityGain (int velocity, bool sensitive);
} // namespace kbk
