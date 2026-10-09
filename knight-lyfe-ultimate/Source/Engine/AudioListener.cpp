#include "AudioListener.h"

namespace knightlyfe
{

AudioListener::AudioListener()
    : fifoData ((size_t) (1 << 16)),
      history ((size_t) spectrumSize, 0.0f),
      fftData ((size_t) spectrumSize * 2, 0.0f),
      window ((size_t) spectrumSize),
      smoothed ((size_t) spectrumSize / 2, 0.0f)
{
    // Blackman, like the browser's AnalyserNode.
    for (int i = 0; i < spectrumSize; ++i)
    {
        const double x = juce::MathConstants<double>::twoPi * i / spectrumSize;
        window[(size_t) i] = (float) (0.42 - 0.5 * std::cos (x) + 0.08 * std::cos (2.0 * x));
    }
}

void AudioListener::prepare (double sr)
{
    sampleRate = sr;
    fifo.reset();
    std::fill (history.begin(), history.end(), 0.0f);
    std::fill (smoothed.begin(), smoothed.end(), 0.0f);
}

void AudioListener::push (const juce::AudioBuffer<float>& input, int numSamples) noexcept
{
    if (! active.load (std::memory_order_relaxed) || input.getNumChannels() == 0)
        return;
    const int channels = input.getNumChannels();
    const float scale = 1.0f / (float) channels;
    const auto scope = fifo.write (juce::jmin (numSamples, fifo.getFreeSpace()));
    auto copy = [&] (int start, int size, int from) {
        for (int i = 0; i < size; ++i)
        {
            float s = 0.0f;
            for (int ch = 0; ch < channels; ++ch)
                s += input.getSample (ch, from + i);
            fifoData[(size_t) (start + i)] = s * scale;
        }
    };
    copy (scope.startIndex1, scope.blockSize1, 0);
    copy (scope.startIndex2, scope.blockSize2, scope.blockSize1);
}

void AudioListener::analyse (Result& out, double maxHz)
{
    // 1. Newest audio onto the end of the history.
    const int ready = fifo.getNumReady();
    const int take = juce::jmin (ready, spectrumSize);
    {
        const auto skipped = fifo.read (ready - take); // more than a window behind: drop the oldest
    }
    if (take > 0)
    {
        std::move (history.begin() + take, history.end(), history.begin());
        const auto scope = fifo.read (take);
        auto* dest = history.data() + spectrumSize - take;
        std::copy_n (fifoData.data() + scope.startIndex1, scope.blockSize1, dest);
        std::copy_n (fifoData.data() + scope.startIndex2, scope.blockSize2, dest + scope.blockSize1);
    }

    // 2. Pitch from the newest 2048 samples (4096 for bass), as the website does.
    const bool bass = bassRange.load();
    const int pitchSize = bass ? 4096 : 2048;
    const float* newest = history.data() + spectrumSize - pitchSize;
    double sq = 0.0;
    for (int i = 0; i < pitchSize; ++i)
        sq += (double) newest[i] * newest[i];
    out.rms = (float) std::sqrt (sq / pitchSize);
    const double f = detectPitch (newest, pitchSize, sampleRate, bass ? 35.0 : 55.0, bass ? 450.0 : 1400.0);
    out.hasPitch = f > 0.0;
    out.note = out.hasPitch ? 69.0 + 12.0 * std::log2 (f / 440.0) : 0.0;

    // 3. Spectrum: windowed FFT, magnitude / N, smoothed over time (0.3, like the
    //    website's chord analyser), in dB.
    for (int i = 0; i < spectrumSize; ++i)
        fftData[(size_t) i] = history[(size_t) i] * window[(size_t) i];
    std::fill (fftData.begin() + spectrumSize, fftData.end(), 0.0f);
    fft.performFrequencyOnlyForwardTransform (fftData.data(), true);
    const int bins = juce::jlimit (1, spectrumSize / 2, (int) std::ceil (maxHz * spectrumSize / sampleRate) + 2);
    out.spectrumDb.resize ((size_t) bins);
    for (int k = 0; k < spectrumSize / 2; ++k)
    {
        auto& s = smoothed[(size_t) k];
        s = 0.3f * s + 0.7f * fftData[(size_t) k] / (float) spectrumSize;
        if (k < bins)
            out.spectrumDb[(size_t) k] = juce::Decibels::gainToDecibels (s, -140.0f);
    }
    out.fftSize = spectrumSize;
    out.sampleRate = sampleRate;
}

double AudioListener::detectPitch (const float* buf, int n, double sr, double minFreq, double maxFreq, float gate)
{
    double rms = 0.0;
    for (int i = 0; i < n; ++i)
        rms += (double) buf[i] * buf[i];
    if (std::sqrt (rms / n) < gate)
        return 0.0;
    const int minLag = juce::jmax (2, (int) std::floor (sr / maxFreq));
    const int maxLag = juce::jmin ((int) std::floor (sr / minFreq), n / 2);
    const int len = n - maxLag;
    std::vector<double> corr ((size_t) maxLag + 2, 0.0);
    double best = -1.0;
    for (int lag = minLag; lag <= maxLag + 1; ++lag)
    {
        double sum = 0.0, e1 = 0.0, e2 = 0.0;
        for (int i = 0; i < len; ++i)
        {
            const double a = buf[i], b = buf[i + lag];
            sum += a * b;
            e1 += a * a;
            e2 += b * b;
        }
        const double norm = std::sqrt (e1 * e2);
        corr[(size_t) lag] = sum / (norm > 0.0 ? norm : 1.0);
        best = juce::jmax (best, corr[(size_t) lag]);
    }
    if (best < 0.8)
        return 0.0;
    // The first peak close to the best one is the true period (avoids octave errors).
    for (int lag = minLag + 1; lag <= maxLag; ++lag)
    {
        const double a = corr[(size_t) lag - 1], b = corr[(size_t) lag], c = corr[(size_t) lag + 1];
        if (b >= 0.93 * best && b >= a && b >= c)
        {
            const double den = 2.0 * (a - 2.0 * b + c);
            const double shift = den != 0.0 ? (a - c) / den : 0.0;
            return sr / (lag + (std::isfinite (shift) ? shift : 0.0));
        }
    }
    return 0.0;
}

} // namespace knightlyfe
