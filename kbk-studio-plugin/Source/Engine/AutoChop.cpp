#include "AutoChop.h"

#include <algorithm>
#include <cmath>

namespace kbk
{
namespace
{
constexpr int hop = 512;

struct OnsetCurve
{
    std::vector<float> env, flux;
    int frames = 0;
    double fps = 0.0;
};

OnsetCurve onsetCurve (const juce::AudioBuffer<float>& audio, double sampleRate)
{
    OnsetCurve oc;
    const int n = audio.getNumSamples();
    const int chans = juce::jmax (1, audio.getNumChannels());
    oc.frames = n / hop;
    oc.fps = sampleRate / hop;
    oc.env.assign ((size_t) oc.frames, 0.0f);
    oc.flux.assign ((size_t) oc.frames, 0.0f);
    for (int f = 0; f < oc.frames; ++f)
    {
        double s = 0.0;
        for (int i = f * hop; i < (f + 1) * hop; ++i)
        {
            float m = 0.0f;
            for (int c = 0; c < audio.getNumChannels(); ++c)
                m += audio.getSample (c, i);
            m /= (float) chans;
            s += (double) m * m;
        }
        oc.env[(size_t) f] = (float) std::sqrt (s / hop);
    }
    for (int f = 1; f < oc.frames; ++f)
        oc.flux[(size_t) f] = juce::jmax (0.0f, oc.env[(size_t) f] - oc.env[(size_t) f - 1]);
    return oc;
}

struct Peak
{
    int frame;
    float strength;
};

std::vector<Peak> onsetPeaks (const OnsetCurve& oc, float sensitivity = 1.5f)
{
    std::vector<Peak> peaks;
    const int win = 8;
    float mx = 0.0f;
    for (auto v : oc.flux)
        mx = juce::jmax (mx, v);
    const float floor = mx * 0.04f;
    for (int f = 1; f < oc.frames - 1; ++f)
    {
        const float v = oc.flux[(size_t) f];
        if (v <= oc.flux[(size_t) f - 1] || v < oc.flux[(size_t) f + 1] || v < floor)
            continue;
        double mean = 0.0;
        int cnt = 0;
        for (int k = juce::jmax (0, f - win); k <= juce::jmin (oc.frames - 1, f + win); ++k)
        {
            mean += oc.flux[(size_t) k];
            ++cnt;
        }
        if (v > (float) (mean / cnt) * sensitivity)
            peaks.push_back ({ f, v });
    }
    return peaks;
}

std::pair<double, double> audibleRange (const juce::AudioBuffer<float>& audio, double sampleRate, float thresholdDb = -45.0f)
{
    const float th = juce::Decibels::decibelsToGain (thresholdDb);
    const int n = audio.getNumSamples();
    auto loud = [&] (int i)
    {
        for (int c = 0; c < audio.getNumChannels(); ++c)
            if (std::abs (audio.getSample (c, i)) > th)
                return true;
        return false;
    };
    int a = 0;
    while (a < n && ! loud (a))
        ++a;
    int b = n - 1;
    while (b > a && ! loud (b))
        --b;
    return { a / sampleRate, (b + 1) / sampleRate };
}

double tempoFrom (const OnsetCurve& oc)
{
    const int n = juce::jmin (oc.frames, (int) std::round (oc.fps * 90.0)); // the first 90 s is plenty
    if (n < oc.fps * 2.0)
        return 0.0;
    double mean = 0.0;
    for (int i = 0; i < n; ++i)
        mean += oc.flux[(size_t) i];
    mean /= n;
    std::vector<double> x ((size_t) n);
    for (int i = 0; i < n; ++i)
        x[(size_t) i] = oc.flux[(size_t) i] - mean;

    auto ac = [&] (double lag)
    {
        const int l0 = (int) std::floor (lag);
        const double t = lag - l0;
        double s = 0.0;
        for (int i = 0; i + l0 + 1 < n; ++i)
            s += x[(size_t) i] * (x[(size_t) (i + l0)] * (1.0 - t) + x[(size_t) (i + l0 + 1)] * t);
        return s;
    };
    double best = 0.0, bestBpm = 0.0;
    for (double bpm = 70.0; bpm <= 160.0; bpm += 0.5)
    {
        const double lag = (60.0 / bpm) * oc.fps;
        const double score = ac (lag) + 0.5 * ac (lag * 2.0); // a real beat also lines up at 2x
        if (score > best)
        {
            best = score;
            bestBpm = bpm;
        }
    }
    return best > 0.0 ? bestBpm : 0.0;
}
} // namespace

double estimateTempo (const juce::AudioBuffer<float>& audio, double sampleRate)
{
    return tempoFrom (onsetCurve (audio, sampleRate));
}

std::vector<double> hitTimes (const juce::AudioBuffer<float>& audio, double sampleRate, float minStrength)
{
    const auto oc = onsetCurve (audio, sampleRate);
    const auto peaks = onsetPeaks (oc, 1.8f);
    float mx = 0.0f;
    for (auto& p : peaks)
        mx = juce::jmax (mx, p.strength);
    std::vector<double> t;
    for (auto& p : peaks)
    {
        // a hit jumps in level within ~23 ms; tones beating against each
        // other swell much more slowly and don't count
        const float before = oc.env[(size_t) juce::jmax (0, p.frame - 2)];
        const bool sharp = oc.env[(size_t) p.frame] >= before * 1.4f + 1e-6f;
        if (sharp && p.strength >= mx * minStrength && (t.empty() || p.frame / oc.fps - t.back() >= 0.08))
            t.push_back (p.frame / oc.fps);
    }
    return t;
}

std::vector<Range> chopEqual (double durationSec, int count)
{
    std::vector<Range> r;
    for (int i = 0; i < count; ++i)
        r.push_back ({ durationSec * i / count, durationSec * (i + 1) / count });
    return r;
}

std::vector<Range> chopAtHits (const juce::AudioBuffer<float>& audio, double sampleRate, int count)
{
    const double dur = audio.getNumSamples() / sampleRate;
    auto oc = onsetCurve (audio, sampleRate);
    auto peaks = onsetPeaks (oc, 1.8f);
    std::sort (peaks.begin(), peaks.end(), [] (auto& a, auto& b) { return a.strength > b.strength; });
    std::vector<double> starts { 0.0 };
    for (auto& p : peaks)
    {
        if ((int) starts.size() >= count)
            break;
        const double at = p.frame / oc.fps;
        if (std::all_of (starts.begin(), starts.end(), [&] (double s) { return std::abs (s - at) >= 0.12; }))
            starts.push_back (at);
    }
    std::sort (starts.begin(), starts.end());
    std::vector<Range> r;
    for (size_t i = 0; i < starts.size(); ++i)
        r.push_back ({ starts[i], i + 1 < starts.size() ? starts[i + 1] : dur });
    return r;
}

ChopResult autoChop (const juce::AudioBuffer<float>& audio, double sampleRate, ChopSettings s)
{
    ChopResult res;
    const double dur = audio.getNumSamples() / sampleRate;
    if (dur <= s.oneShotSec)
    {
        res.kind = ChopResult::Kind::OneShot;
        res.ranges = { { 0.0, dur } };
        return res;
    }
    const auto [lo, hi] = audibleRange (audio, sampleRate);
    const auto oc = onsetCurve (audio, sampleRate);
    const auto peaks = onsetPeaks (oc);
    auto t = [&] (int frame) { return frame / oc.fps; };

    if (hi - lo <= s.loopSec)
    {
        res.kind = ChopResult::Kind::Loop;
        const double minGap = juce::jmax (0.08, (hi - lo) / (s.count * 3));
        auto sorted = peaks;
        std::sort (sorted.begin(), sorted.end(), [] (auto& a, auto& b) { return a.strength > b.strength; });
        std::vector<double> starts { lo };
        for (auto& p : sorted)
        {
            if ((int) starts.size() >= s.count)
                break;
            const double at = t (p.frame);
            if (at > lo && at < hi - 0.05
                && std::all_of (starts.begin(), starts.end(), [&] (double q) { return std::abs (q - at) >= minGap; }))
                starts.push_back (at);
        }
        std::sort (starts.begin(), starts.end());
        if ((int) starts.size() < juce::jmin (4, s.count))
        {
            starts.clear();
            for (int i = 0; i < s.count; ++i)
                starts.push_back (lo + (hi - lo) * i / s.count);
        }
        for (size_t i = 0; i < starts.size(); ++i)
            res.ranges.push_back ({ starts[i], i + 1 < starts.size() ? starts[i + 1] : hi });
        return res;
    }

    res.kind = ChopResult::Kind::Song;
    res.bpm = tempoFrom (oc);
    const double bpm = res.bpm > 0.0 ? res.bpm : 90.0;
    const double bar = juce::jlimit (1.2, 4.0, 240.0 / bpm);
    const double span = (hi - lo) / s.count;
    for (int k = 0; k < s.count; ++k)
    {
        const double r0 = lo + k * span, r1 = r0 + span;
        double bestAt = -1.0, bestScore = -1.0;
        for (auto& p : peaks)
        {
            const double at = t (p.frame);
            if (at < r0 || at >= r1 || at + bar > hi)
                continue;
            const double score = p.strength * (0.5 + oc.env[(size_t) p.frame]); // loud hits in loud places
            if (score > bestScore)
            {
                bestScore = score;
                bestAt = at;
            }
        }
        const double start = bestAt >= 0.0 ? bestAt : juce::jmin (r0, juce::jmax (lo, hi - bar));
        // end just before the hit nearest to one bar later
        double end = start + bar, near = -1.0;
        for (auto& p : peaks)
        {
            const double at = t (p.frame);
            if (at > start + bar * 0.75 && at < start + bar * 1.1
                && (near < 0.0 || std::abs (at - (start + bar)) < std::abs (near - (start + bar))))
                near = at;
        }
        if (near >= 0.0)
            end = near - 0.005;
        res.ranges.push_back ({ start, juce::jmin (hi, end) });
    }
    return res;
}

juce::AudioBuffer<float> cut (const juce::AudioBuffer<float>& audio, double sampleRate, Range range)
{
    const int n = audio.getNumSamples();
    const int a = juce::jlimit (0, n, (int) std::round (range.first * sampleRate));
    const int b = juce::jlimit (a, n, (int) std::round (range.second * sampleRate));
    juce::AudioBuffer<float> out (juce::jmax (1, audio.getNumChannels()), juce::jmax (1, b - a));
    out.clear();
    for (int c = 0; c < audio.getNumChannels(); ++c)
        if (b > a)
            out.copyFrom (c, 0, audio, c, a, b - a);
    const int len = b - a;
    const int fade = juce::jmin (len / 2, (int) std::round (0.003 * sampleRate));
    if (fade > 0)
    {
        out.applyGainRamp (0, fade, 0.0f, 1.0f);
        out.applyGainRamp (len - fade, fade, 1.0f, 0.0f);
    }
    return out;
}
} // namespace kbk
