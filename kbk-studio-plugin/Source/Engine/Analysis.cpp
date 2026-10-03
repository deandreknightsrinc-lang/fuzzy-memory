#include "Analysis.h"
#include "AutoChop.h"

#include <juce_dsp/juce_dsp.h>
#include <cmath>
#include <numeric>

namespace kbk
{
namespace
{
// RBJ-style biquad, direct form I, run over a whole channel
struct Biquad
{
    double b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
    void run (std::vector<double>& x) const
    {
        double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (auto& v : x)
        {
            const double y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1;
            x1 = v;
            y2 = y1;
            y1 = y;
            v = y;
        }
    }
};

// The two K-weighting stages of BS.1770, designed for any sample rate
// (same formulas as libebur128).
std::pair<Biquad, Biquad> kWeighting (double fs)
{
    Biquad shelf, hp;
    {
        const double f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
        const double K = std::tan (juce::MathConstants<double>::pi * f0 / fs);
        const double Vh = std::pow (10.0, G / 20.0), Vb = std::pow (Vh, 0.4996667741545416);
        const double a0 = 1.0 + K / Q + K * K;
        shelf.b0 = (Vh + Vb * K / Q + K * K) / a0;
        shelf.b1 = 2.0 * (K * K - Vh) / a0;
        shelf.b2 = (Vh - Vb * K / Q + K * K) / a0;
        shelf.a1 = 2.0 * (K * K - 1.0) / a0;
        shelf.a2 = (1.0 - K / Q + K * K) / a0;
    }
    {
        const double f0 = 38.13547087602444, Q = 0.5003270373238773;
        const double K = std::tan (juce::MathConstants<double>::pi * f0 / fs);
        const double a0 = 1.0 + K / Q + K * K;
        hp.b0 = 1.0;
        hp.b1 = -2.0;
        hp.b2 = 1.0;
        hp.a1 = 2.0 * (K * K - 1.0) / a0;
        hp.a2 = (1.0 - K / Q + K * K) / a0;
    }
    return { shelf, hp };
}

constexpr float majorProfile[12] = { 6.35f, 2.23f, 3.48f, 2.33f, 4.38f, 4.09f, 2.52f, 5.19f, 2.39f, 3.66f, 2.29f, 2.88f };
constexpr float minorProfile[12] = { 6.33f, 2.68f, 3.52f, 5.38f, 2.60f, 3.53f, 2.54f, 4.75f, 3.98f, 2.69f, 3.34f, 3.17f };

float correlate (const float* chroma, const float* profile, int rotation)
{
    float mc = 0, mp = 0;
    for (int i = 0; i < 12; ++i)
    {
        mc += chroma[i];
        mp += profile[i];
    }
    mc /= 12.0f;
    mp /= 12.0f;
    float num = 0, dc = 0, dp = 0;
    for (int i = 0; i < 12; ++i)
    {
        const float c = chroma[(i + rotation) % 12] - mc, p = profile[i] - mp;
        num += c * p;
        dc += c * c;
        dp += p * p;
    }
    return dc > 0 && dp > 0 ? num / std::sqrt (dc * dp) : 0.0f;
}

std::vector<float> monoOf (const juce::AudioBuffer<float>& a)
{
    std::vector<float> m ((size_t) a.getNumSamples(), 0.0f);
    const int ch = juce::jmax (1, a.getNumChannels());
    for (int c = 0; c < a.getNumChannels(); ++c)
        for (int i = 0; i < a.getNumSamples(); ++i)
            m[(size_t) i] += a.getSample (c, i) / (float) ch;
    return m;
}
} // namespace

double integratedLufs (const juce::AudioBuffer<float>& audio, double fs)
{
    const int n = audio.getNumSamples();
    const int block = (int) std::round (0.4 * fs), step = (int) std::round (0.1 * fs);
    if (n < block)
        return -100.0;
    auto [shelf, hp] = kWeighting (fs);
    std::vector<std::vector<double>> ch;
    for (int c = 0; c < juce::jmin (2, audio.getNumChannels()); ++c)
    {
        std::vector<double> x ((size_t) n);
        for (int i = 0; i < n; ++i)
            x[(size_t) i] = audio.getSample (c, i);
        shelf.run (x);
        hp.run (x);
        ch.push_back (std::move (x));
    }
    // mean square per 400 ms block (75% overlap), summed over channels
    std::vector<double> z;
    for (int s = 0; s + block <= n; s += step)
    {
        double sum = 0;
        for (auto& x : ch)
        {
            double e = 0;
            for (int i = s; i < s + block; ++i)
                e += x[(size_t) i] * x[(size_t) i];
            sum += e / block;
        }
        z.push_back (sum);
    }
    auto loud = [] (double v) { return -0.691 + 10.0 * std::log10 (juce::jmax (v, 1e-20)); };
    std::vector<double> gated;
    for (auto v : z)
        if (loud (v) > -70.0)
            gated.push_back (v);
    if (gated.empty())
        return -100.0;
    const double relGate = loud (std::accumulate (gated.begin(), gated.end(), 0.0) / gated.size()) - 10.0;
    double sum = 0;
    int cnt = 0;
    for (auto v : gated)
        if (loud (v) > relGate)
        {
            sum += v;
            ++cnt;
        }
    return cnt > 0 ? loud (sum / cnt) : -100.0;
}

int estimateKey (const juce::AudioBuffer<float>& audio, double fs, bool& minor, float& confidence)
{
    const auto mono = monoOf (audio);
    constexpr int order = 13, size = 1 << order; // 8192-point FFT: ~5 Hz bins at 44.1 kHz
    juce::dsp::FFT fft (order);
    juce::dsp::WindowingFunction<float> window (size, juce::dsp::WindowingFunction<float>::hann, false);
    std::vector<float> buf ((size_t) size * 2);
    float chroma[12] = {};
    const int hop = size / 2;
    for (int s = 0; s + size <= (int) mono.size() || s == 0; s += hop)
    {
        std::fill (buf.begin(), buf.end(), 0.0f);
        for (int i = 0; i < size && s + i < (int) mono.size(); ++i)
            buf[(size_t) i] = mono[(size_t) (s + i)];
        window.multiplyWithWindowingTable (buf.data(), size);
        fft.performFrequencyOnlyForwardTransform (buf.data());
        for (int k = 1; k < size / 2; ++k)
        {
            const double f = k * fs / size;
            if (f < 55.0 || f > 4200.0)
                continue;
            const double midi = 69.0 + 12.0 * std::log2 (f / 440.0);
            const int pc = ((int) std::lround (midi) % 12 + 12) % 12;
            chroma[pc] += std::sqrt (buf[(size_t) k]); // compress so loud bass doesn't drown the rest
        }
        if (s + size > (int) mono.size())
            break;
    }
    float best = -2.0f;
    int root = -1;
    for (int r = 0; r < 12; ++r)
    {
        const float maj = correlate (chroma, majorProfile, r), mnr = correlate (chroma, minorProfile, r);
        if (maj > best)
        {
            best = maj;
            root = r;
            minor = false;
        }
        if (mnr > best)
        {
            best = mnr;
            root = r;
            minor = true;
        }
    }
    confidence = juce::jmax (0.0f, best);
    return best > 0.5f ? root : -1; // below that it's drums/noise: no honest key
}

Analysis analyze (const juce::AudioBuffer<float>& audio, double fs, double knownBpm)
{
    Analysis a;
    const int n = audio.getNumSamples();
    a.seconds = n / fs;
    a.peakDb = juce::Decibels::gainToDecibels (audio.getMagnitude (0, n), -100.0f);
    a.lufs = integratedLufs (audio, fs);
    a.keyRoot = estimateKey (audio, fs, a.minor, a.keyConfidence);

    if (a.seconds > 0.5)
        a.hitsPerSecond = (float) (hitTimes (audio, fs).size() / a.seconds);

    // tempo: the song's tempo when this is a chop of it; else measure it if
    // there's enough rhythm to measure; else guess from a loop's length
    if (knownBpm > 0)
    {
        a.bpm = knownBpm;
        a.bpmSource = "from the chop";
    }
    else if (a.seconds >= 6.0 && a.hitsPerSecond >= 0.8f)
    {
        a.bpm = estimateTempo (audio, fs);
        if (a.bpm > 0)
            a.bpmSource = "measured";
    }
    if (a.bpm <= 0 && a.seconds >= 1.0)
    {
        // a loop is usually 1, 2 or 4 bars of 4/4
        for (int bars : { 1, 2, 4, 8 })
        {
            const double bpm = 240.0 * bars / a.seconds;
            if (bpm >= 70.0 && bpm <= 160.0)
            {
                a.bpm = std::round (bpm * 10.0) / 10.0;
                a.bpmSource = "from the length";
                break;
            }
        }
    }

    // brightness (spectral centroid) and hits per second, on the mono mix
    const auto mono = monoOf (audio);
    constexpr int order = 11, size = 1 << order;
    juce::dsp::FFT fft (order);
    juce::dsp::WindowingFunction<float> window (size, juce::dsp::WindowingFunction<float>::hann, false);
    std::vector<float> buf ((size_t) size * 2);
    double num = 0, den = 0;
    for (int s = 0; s + size <= (int) mono.size(); s += size)
    {
        std::fill (buf.begin(), buf.end(), 0.0f);
        std::copy (mono.begin() + s, mono.begin() + s + size, buf.begin());
        window.multiplyWithWindowingTable (buf.data(), size);
        fft.performFrequencyOnlyForwardTransform (buf.data());
        for (int k = 1; k < size / 2; ++k)
        {
            const double f = k * fs / size, m = buf[(size_t) k];
            num += f * m * m;
            den += m * m;
        }
    }
    a.centroidHz = den > 0 ? (float) (num / den) : 0.0f;
    return a;
}

juce::String keyName (int root, bool minor)
{
    static const char* names[12] = { "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B" };
    if (root < 0)
        return "no clear key";
    return juce::String (names[root % 12]) + (minor ? " minor" : " major");
}

juce::String brightnessWord (float c)
{
    if (c <= 0.0f)
        return {};
    if (c < 1200.0f)
        return "dark";
    if (c < 2500.0f)
        return "warm";
    if (c < 4500.0f)
        return "clear";
    return "bright";
}

juce::String summary (const Analysis& a)
{
    juce::StringArray parts;
    parts.add (a.bpm > 0 ? juce::String (a.bpm, a.bpm == std::round (a.bpm) ? 0 : 1) + " BPM" + (a.bpmSource == "measured" ? "" : " (" + a.bpmSource + ")")
                         : juce::String ("tempo: too short to tell"));
    parts.add (keyName (a.keyRoot, a.minor) + (a.keyRoot >= 0 ? " (" + juce::String (juce::roundToInt (a.keyConfidence * 100)) + "% sure)" : juce::String()));
    parts.add (a.lufs > -99 ? juce::String (a.lufs, 1) + " LUFS" : juce::String ("too short for LUFS"));
    parts.add ("peak " + juce::String (a.peakDb, 1) + " dB");
    parts.add (brightnessWord (a.centroidHz) + " (" + juce::String (a.centroidHz / 1000.0f, 1) + " kHz)");
    return parts.joinIntoString ("  -  ");
}

juce::String sunoPrompt (const Analysis& a)
{
    // Only describes the sound. No artist, band or song names, ever.
    juce::StringArray p;
    if (a.bpm > 0)
    {
        const double b = a.bpm;
        p.add (b < 75 ? "slow, laid-back groove" : b < 95 ? "mid-tempo, head-nodding groove" : b < 115 ? "steady upbeat groove"
                                                                                  : b < 135 ? "upbeat, driving rhythm" : "fast, high-energy rhythm");
        p.add (juce::String (juce::roundToInt (b)) + " BPM");
    }
    if (a.keyRoot >= 0)
    {
        p.add (keyName (a.keyRoot, a.minor));
        p.add (a.minor ? "moody, soulful" : "uplifting, hopeful");
    }
    const auto br = brightnessWord (a.centroidHz);
    if (br == "dark")
        p.add ("dark, heavy low end");
    else if (br == "warm")
        p.add ("warm, round tone");
    else if (br == "clear")
        p.add ("clear, present mix");
    else if (br == "bright")
        p.add ("bright, airy top end");
    if (a.hitsPerSecond > 3.0f)
        p.add ("busy, percussive drums");
    else if (a.hitsPerSecond > 0.0f && a.hitsPerSecond < 1.0f)
        p.add ("sparse, spacious arrangement");
    if (a.lufs > -10.0)
        p.add ("loud, punchy, polished master");
    else if (a.lufs > -100.0 && a.lufs < -18.0)
        p.add ("soft, dynamic, intimate mix");
    auto text = p.joinIntoString (", ");
    while (text.length() > 200 && p.size() > 1) // Suno's style box: keep it short
    {
        p.remove (p.size() - 1);
        text = p.joinIntoString (", ");
    }
    return text;
}
} // namespace kbk
