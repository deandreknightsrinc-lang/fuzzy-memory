#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <utility>
#include <vector>

// Works out where to cut audio so it spreads across the pads. Same rules as
// the KBK Studio web app (kbk-studio/js/audio-utils.js, autoChop):
//   one-shot (<= 1.5 s): no chop, it belongs on one pad
//   loop / break (<= 20 s): cut at the hits, each slice ends where the next begins
//   song: find the tempo, take one bar from the strongest hit in each 1/16 of
//         the song, so the chops cover the whole track in order
namespace kbk
{
using Range = std::pair<double, double>; // seconds

struct ChopResult
{
    enum class Kind { OneShot, Loop, Song };
    Kind kind = Kind::OneShot;
    double bpm = 0.0;
    std::vector<Range> ranges;
};

struct ChopSettings
{
    int count = 16;
    double oneShotSec = 1.5;
    double loopSec = 20.0;
};

ChopResult autoChop (const juce::AudioBuffer<float>& audio, double sampleRate, ChopSettings settings = {});

// Tempo from the onset curve, folded into 70-160 BPM. 0 when it can't tell.
double estimateTempo (const juce::AudioBuffer<float>& audio, double sampleRate);

// Slices that start at the strongest hits (always one at 0), at most `count`.
std::vector<Range> chopAtHits (const juce::AudioBuffer<float>& audio, double sampleRate, int count = 16);

// Times (seconds) of the clear hits: onsets at least `minStrength` (0..1) of the strongest.
std::vector<double> hitTimes (const juce::AudioBuffer<float>& audio, double sampleRate, float minStrength = 0.3f);

// `count` equal slices.
std::vector<Range> chopEqual (double durationSec, int count);

// Copies [start, end) out of the audio with 3 ms fades so a cut never clicks.
juce::AudioBuffer<float> cut (const juce::AudioBuffer<float>& audio, double sampleRate, Range range);
} // namespace kbk
