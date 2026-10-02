#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

#include <array>
#include <atomic>

namespace knightlyfe
{

/** Synthesized General MIDI drum kit (kick, snare, hats, toms, cymbals, percussion).
    The same recipes as the Knight Keys web synth, so grooves sound alike in both. */
class DrumSynth
{
public:
    /** A recorded one-shot that replaces the synthesized sound of one note. */
    struct Sample
    {
        juce::AudioBuffer<float> audio; // 1 or 2 channels
        double sampleRate = 44100.0;
    };

    DrumSynth();

    void prepare (double sampleRate);

    /** Kit Rack settings for one note (any thread): tune in semitones, decay and
        level as multipliers (1 = the stock sound). */
    void setPiece (int note, float tuneSemitones, float decay, float level) noexcept;
    /** Plays `sample` (or the synthesized sound again, if nullptr) for `note`.
        The sample must stay alive while it may be playing; SoundEngine owns them. */
    void setSample (int note, const Sample* sample) noexcept;

    /** Starts a hit `offset` samples into the next render call. `gain` scales the hit. */
    void trigger (int note, int velocity127, float gain, int offset);

    /** Silences hits started after `offset` and fades out ringing ones. */
    void stopAll();

    void render (juce::AudioBuffer<float>& out, int startSample, int numSamples);

private:
    struct Hit
    {
        bool active = false;
        int delay = 0;          // samples before it starts
        int age = 0;            // samples since it started
        int length = 0;         // samples until it stops
        float amp = 0.0f, pan = 0.5f;
        // tone part
        float toneLevel = 0.0f, f0 = 0.0f, f1 = 0.0f, sweep = 0.0f, toneDecay = 0.0f, phase = 0.0f;
        float sweepEnv = 1.0f, toneEnv = 1.0f, noiseEnv = 1.0f; // running envelopes
        bool square = false;
        float f2 = 0.0f, phase2 = 0.0f; // second oscillator (cowbell)
        // noise part
        float noiseLevel = 0.0f, noiseDecay = 0.0f, hp = 0.0f, lp = 1.0f;
        float hpState = 0.0f, hpPrev = 0.0f, lpState = 0.0f;
        int bursts = 0;         // clap
        bool openHat = false;
        // recorded sample
        const Sample* sample = nullptr;
        double pos = 0.0, step = 1.0;
        int sampleEnd = 0;      // where the (decay-shortened) sample fades out
    };

    Hit* freeHit();
    float coeffFor (float seconds) const;

    void renderSample (Hit&, float* outL, float* outR, int startSample, int numSamples);

    std::array<Hit, 32> hits;
    std::array<std::atomic<float>, 128> pieceTune, pieceDecay, pieceLevel;
    std::array<std::atomic<const Sample*>, 128> pieceSample;
    double sampleRate = 44100.0;
    juce::Random random;
};

} // namespace knightlyfe
