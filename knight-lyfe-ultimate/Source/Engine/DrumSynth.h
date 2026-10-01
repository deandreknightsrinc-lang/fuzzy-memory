#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

#include <array>

namespace knightlyfe
{

/** Synthesized General MIDI drum kit (kick, snare, hats, toms, cymbals, percussion).
    The same recipes as the Knight Keys web synth, so grooves sound alike in both. */
class DrumSynth
{
public:
    void prepare (double sampleRate);

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
    };

    Hit* freeHit();
    float coeffFor (float seconds) const;

    std::array<Hit, 32> hits;
    double sampleRate = 44100.0;
    juce::Random random;
};

} // namespace knightlyfe
