#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

// Analyze: what a take or sample is. BPM, key, loudness (LUFS, as streaming
// services measure it), peak, brightness and how busy it is, plus a
// rights-clean Suno style prompt built only from those facts (no artist,
// band or song names).
namespace kbk
{
struct Analysis
{
    double seconds = 0.0;
    double bpm = 0.0;
    juce::String bpmSource;   // "measured", "from the chop", "from the length", or empty
    int keyRoot = -1;         // 0 = C ... 11 = B, -1 = no clear key (drums)
    bool minor = false;
    float keyConfidence = 0.0f; // 0..1 correlation with the key profile
    double lufs = -100.0;     // integrated loudness
    float peakDb = -100.0f;   // sample peak, dBFS
    float centroidHz = 0.0f;  // spectral centroid: higher = brighter
    float hitsPerSecond = 0.0f;
};

// knownBpm: the tempo of the song this came from (a chop), or 0.
Analysis analyze (const juce::AudioBuffer<float>& audio, double sampleRate, double knownBpm = 0.0);

// ITU-R BS.1770-4 integrated loudness with K-weighting and gating.
double integratedLufs (const juce::AudioBuffer<float>& audio, double sampleRate);

// Krumhansl-Schmuckler key estimate. Returns the root (or -1) and sets minor/confidence.
int estimateKey (const juce::AudioBuffer<float>& audio, double sampleRate, bool& minor, float& confidence);

juce::String keyName (int root, bool minor);
juce::String brightnessWord (float centroidHz);
juce::String summary (const Analysis& a);   // "92 BPM - A minor - -11.2 LUFS - peak -0.8 dB - warm"
juce::String sunoPrompt (const Analysis& a); // "mid-tempo, head-nodding groove, 92 BPM, A minor, moody..."
} // namespace kbk
