#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include <atomic>
#include <vector>

namespace knightlyfe
{

/**
    Hears what you play into the microphone or an audio interface (guitar, bass, voice,
    an acoustic piano), so lessons can listen inside the app the same way they do on
    the website, where the browser's microphone does it.

    The audio thread only copies the input (push); the message thread analyses the
    newest audio about 30 times a second (analyse), like the website's AnalyserNodes:
      - pitch: the single note sounding (same autocorrelation as detectPitch in
        knight-keys/js/pitch.js), for note steps and singing
      - spectrum: dB per FFT bin (8192 points, Blackman window, magnitude / N, like
        AnalyserNode.getFloatFrequencyData), so the interface's chromaFromSpectrum
        recognizes strummed chords with exactly the same code as the website.
*/
class AudioListener
{
public:
    static constexpr int spectrumOrder = 13; // 8192-point FFT, as the website's chord analyser
    static constexpr int spectrumSize = 1 << spectrumOrder;

    AudioListener();

    void prepare (double sampleRate);

    /** Listening on or off (message thread). Off, push() does nothing. */
    void setActive (bool on) noexcept { active = on; }
    bool isActive() const noexcept { return active; }

    /** 'bass' listens lower (down to a bass guitar's low E) with a longer window. */
    void setBassRange (bool bass) noexcept { bassRange = bass; }

    /** Audio thread: the input, mixed to mono. */
    void push (const juce::AudioBuffer<float>& input, int numSamples) noexcept;

    struct Result
    {
        bool hasPitch = false;
        double note = 0.0;           // exact MIDI note (69 = A440), when hasPitch
        float rms = 0.0f;            // level of the newest pitch window
        std::vector<float> spectrumDb; // bins 0 .. up to maxHz (dB)
        int fftSize = spectrumSize;
        double sampleRate = 44100.0;
    };

    /** Message thread: takes the newest audio and analyses it. `maxHz` limits the
        bins returned (the chord detector stops at 1200 Hz). */
    void analyse (Result& out, double maxHz = 1500.0);

    /** Pitch of one block by normalized autocorrelation (as detectPitch in pitch.js):
        frequency in Hz, or 0 for silence / no clear pitch. */
    static double detectPitch (const float* buf, int n, double sampleRate,
                               double minFreq = 55.0, double maxFreq = 1400.0, float gate = 0.01f);

private:
    double sampleRate = 44100.0;
    std::atomic<bool> active { false }, bassRange { false };

    juce::AbstractFifo fifo { 1 << 16 };
    std::vector<float> fifoData;
    std::vector<float> history;      // the newest spectrumSize samples, oldest first
    std::vector<float> fftData, window, smoothed;
    juce::dsp::FFT fft { spectrumOrder };
};

} // namespace knightlyfe
