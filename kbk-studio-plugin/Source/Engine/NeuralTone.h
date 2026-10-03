#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <string>
#include <vector>

namespace nam
{
class DSP;
}

// Neural Tone: plays the pads through a Neural Amp Modeler capture (.nam /
// .json) of a real amp, pedal or mic'd rig, using the open-source NAM engine
// (github.com/sdatkinson/NeuralAmpModelerCore). Captures are usually trained
// at 48 kHz; when Logic runs at another rate the audio is converted around
// the model so it sounds the way it was captured.
namespace kbk
{
// Streams audio from one sample rate to another (Lagrange interpolation).
class RateConverter
{
public:
    void prepare (double inRate, double outRate, int maxInputBlock);
    void reset();
    void push (const float* in, int n);
    int available() const; // output samples that can be pulled now
    void pull (float* out, int n);
    double ratio() const { return speed; }

private:
    juce::LagrangeInterpolator interp;
    std::vector<float> fifo;
    int count = 0;
    double speed = 1.0; // input samples per output sample
};

struct NeuralSettings
{
    bool on = false;
    float inDb = 0.0f;   // input gain
    float drive = 0.5f;  // 0..1 = extra 0..+18 dB into the model
    float mix = 1.0f;    // 0 dry .. 1 wet
    float outDb = 0.0f;  // output gain
};

class NeuralTone
{
public:
    NeuralTone();
    ~NeuralTone();

    // Loads a model file's text (JSON). Returns an error message, or empty on success.
    // Call off the audio thread; it allocates and warms the model up.
    static std::string loadModel (const std::string& json, double hostRate, int maxBlock, std::shared_ptr<nam::DSP>& out);

    void prepare (double hostRate, int maxBlock);
    // Swaps in a model (or nullptr). Message thread.
    void setModel (std::shared_ptr<nam::DSP> model);
    bool hasModel() const { return active != nullptr; }
    double modelRate() const;

    // Stereo in place. Audio thread.
    void process (float* L, float* R, int n, const NeuralSettings& s);

private:
    void configure();

    juce::SpinLock lock;
    std::shared_ptr<nam::DSP> active;
    double hostRate = 44100.0;
    int maxBlock = 512;
    bool resampling = false;
    float normGain = 1.0f;
    RateConverter up, down;
    std::vector<float> mono, modelIn, modelOut, wet;
    juce::SmoothedValue<float> inGain, outGain, mixAmount;
};
} // namespace kbk
