#pragma once

// Small, allocation-free DSP building blocks shared by the W.O.M.P. plugins.
// Everything here is real-time safe once prepare()/setSize() has been called.

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <vector>

namespace womp
{
constexpr double kPi = 3.14159265358979323846;
constexpr int kMaxChannels = 2;

//==============================================================================
/** RBJ biquad (transposed direct form II), up to two channels. */
struct Biquad
{
    void reset() noexcept
    {
        z1.fill (0.0f);
        z2.fill (0.0f);
    }

    void setLowShelf (double sampleRate, double freq, double q, double gainDb) noexcept
    {
        const double A     = std::pow (10.0, gainDb / 40.0);
        const double w0    = 2.0 * kPi * freq / sampleRate;
        const double cosw  = std::cos (w0);
        const double alpha = std::sin (w0) / (2.0 * q);
        const double sqA2a = 2.0 * std::sqrt (A) * alpha;

        const double a0 = (A + 1.0) + (A - 1.0) * cosw + sqA2a;
        b0 = (float) (A * ((A + 1.0) - (A - 1.0) * cosw + sqA2a) / a0);
        b1 = (float) (2.0 * A * ((A - 1.0) - (A + 1.0) * cosw) / a0);
        b2 = (float) (A * ((A + 1.0) - (A - 1.0) * cosw - sqA2a) / a0);
        a1 = (float) (-2.0 * ((A - 1.0) + (A + 1.0) * cosw) / a0);
        a2 = (float) (((A + 1.0) + (A - 1.0) * cosw - sqA2a) / a0);
    }

    float process (int ch, float x) noexcept
    {
        const float y = b0 * x + z1[(size_t) ch];
        z1[(size_t) ch] = b1 * x - a1 * y + z2[(size_t) ch];
        z2[(size_t) ch] = b2 * x - a2 * y;
        return y;
    }

    float b0 = 1.0f, b1 = 0.0f, b2 = 0.0f, a1 = 0.0f, a2 = 0.0f;
    std::array<float, kMaxChannels> z1 {}, z2 {};
};

//==============================================================================
/** One-pole DC blocker (~5 Hz). */
struct DCBlocker
{
    void prepare (double sampleRate) noexcept
    {
        r = (float) (1.0 - 2.0 * kPi * 5.0 / sampleRate);
        reset();
    }

    void reset() noexcept
    {
        x1.fill (0.0f);
        y1.fill (0.0f);
    }

    float process (int ch, float x) noexcept
    {
        const auto c = (size_t) ch;
        const float y = x - x1[c] + r * y1[c];
        x1[c] = x;
        y1[c] = y;
        return y;
    }

    float r = 0.9995f;
    std::array<float, kMaxChannels> x1 {}, y1 {};
};

//==============================================================================
/** Integer-sample delay used for latency alignment of dry / parallel paths. */
struct IntegerDelay
{
    void prepare (int numChannels, int delaySamples)
    {
        length = std::max (0, delaySamples);
        buffers.assign ((size_t) numChannels, std::vector<float> ((size_t) std::max (1, length), 0.0f));
        positions.assign ((size_t) numChannels, 0);
    }

    void reset() noexcept
    {
        for (auto& b : buffers)
            std::fill (b.begin(), b.end(), 0.0f);
        std::fill (positions.begin(), positions.end(), 0);
    }

    float process (int ch, float x) noexcept
    {
        if (length == 0)
            return x;

        auto& buf = buffers[(size_t) ch];
        auto& pos = positions[(size_t) ch];
        const float y = buf[(size_t) pos];
        buf[(size_t) pos] = x;
        if (++pos >= length)
            pos = 0;
        return y;
    }

    int length = 0;
    std::vector<std::vector<float>> buffers;
    std::vector<int> positions;
};

//==============================================================================
/** xorshift32 noise source: cheap, deterministic, lock-free. */
struct FastRandom
{
    explicit FastRandom (uint32_t seed = 0x9E3779B9u) noexcept : state (seed != 0 ? seed : 1u) {}

    uint32_t next() noexcept
    {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return state;
    }

    /** [0, 1) */
    float unipolar() noexcept { return (float) (next() >> 8) * (1.0f / 16777216.0f); }

    /** [-1, 1) */
    float bipolar() noexcept { return unipolar() * 2.0f - 1.0f; }

    uint32_t state;
};

//==============================================================================
/** One-pole smoother / filter coefficient from a time constant (seconds). */
inline float onePoleCoeff (double sampleRate, double seconds) noexcept
{
    if (seconds <= 0.0)
        return 1.0f;
    return (float) (1.0 - std::exp (-1.0 / (seconds * sampleRate)));
}

/** One-pole lowpass coefficient from a cutoff frequency. */
inline float onePoleCoeffHz (double sampleRate, double hz) noexcept
{
    return (float) (1.0 - std::exp (-2.0 * kPi * hz / sampleRate));
}

//==============================================================================
/** Smooth random LFO: picks a new random target every `period` seconds and glides to it.
    Output is roughly within [-1, 1]. */
struct RandomDrift
{
    void prepare (double sampleRate, double periodSeconds, uint32_t seed) noexcept
    {
        rng = FastRandom (seed);
        periodSamples = std::max (1, (int) (periodSeconds * sampleRate));
        coeff = onePoleCoeff (sampleRate, periodSeconds * 0.5);
        counter = 0;
        value = 0.0f;
        target = 0.0f;
    }

    float next() noexcept
    {
        if (--counter <= 0)
        {
            counter = periodSamples / 2 + (int) (rng.unipolar() * (float) periodSamples);
            target = rng.bipolar();
        }
        value += coeff * (target - value);
        return value;
    }

    FastRandom rng;
    int periodSamples = 1, counter = 0;
    float coeff = 0.0f, value = 0.0f, target = 0.0f;
};

} // namespace womp
