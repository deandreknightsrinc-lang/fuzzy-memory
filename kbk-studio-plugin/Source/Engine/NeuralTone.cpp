#include "NeuralTone.h"

#include "NAM/dsp.h"
#include "NAM/get_dsp.h"
#include "json.hpp"

#include <cmath>
#include <cstring>

namespace kbk
{
namespace
{
// The rate a model runs at. Older captures don't record theirs; like the NAM
// plug-in, assume NAM's standard 48 kHz for those.
double rateFor (nam::DSP& dsp, double hostRate)
{
    if (dsp.SupportsArbitrarySampleRate())
        return hostRate;
    return dsp.GetExpectedSampleRate() > 0.0 ? dsp.GetExpectedSampleRate() : 48000.0;
}
} // namespace

// ---- rate converter -----------------------------------------------------------

void RateConverter::prepare (double inRate, double outRate, int maxInputBlock)
{
    speed = inRate / outRate;
    fifo.assign ((size_t) (maxInputBlock * 4 + 256), 0.0f);
    reset();
}

void RateConverter::reset()
{
    interp.reset();
    count = 0;
}

void RateConverter::push (const float* in, int n)
{
    n = juce::jmin (n, (int) fifo.size() - count); // never grows on the audio thread
    std::memcpy (fifo.data() + count, in, sizeof (float) * (size_t) n);
    count += n;
}

int RateConverter::available() const
{
    return juce::jmax (0, (int) std::floor ((count - 2) / speed));
}

void RateConverter::pull (float* out, int n)
{
    const int used = juce::jlimit (0, count, interp.process (speed, fifo.data(), out, n));
    std::memmove (fifo.data(), fifo.data() + used, sizeof (float) * (size_t) (count - used));
    count -= used;
}

// ---- neural tone ------------------------------------------------------------------

NeuralTone::NeuralTone() = default;
NeuralTone::~NeuralTone() = default;

std::string NeuralTone::loadModel (const std::string& json, double hostRate, int maxBlock, std::shared_ptr<nam::DSP>& out)
{
    try
    {
        auto config = nlohmann::json::parse (json);
        std::unique_ptr<nam::DSP> dsp = nam::get_dsp (config);
        if (dsp == nullptr)
            return "The file isn't a Neural Amp Modeler model.";
        const double rate = rateFor (*dsp, hostRate);
        const int block = (int) std::ceil (maxBlock * rate / hostRate) + 16;
        dsp->ResetAndPrewarm (rate, block);
        out = std::shared_ptr<nam::DSP> (dsp.release());
        return {};
    }
    catch (const std::exception& e)
    {
        return std::string ("Couldn't load that amp model: ") + e.what();
    }
}

double NeuralTone::modelRate() const
{
    return active != nullptr ? rateFor (*active, hostRate) : hostRate;
}

void NeuralTone::prepare (double rate, int block)
{
    const juce::SpinLock::ScopedLockType sl (lock);
    hostRate = rate;
    maxBlock = juce::jmax (1, block);
    inGain.reset (rate, 0.03);
    outGain.reset (rate, 0.03);
    mixAmount.reset (rate, 0.03);
    configure();
}

void NeuralTone::setModel (std::shared_ptr<nam::DSP> model)
{
    std::shared_ptr<nam::DSP> old;
    {
        const juce::SpinLock::ScopedLockType sl (lock);
        old = std::move (active); // the old model is freed here, not on the audio thread
        active = std::move (model);
        configure();
    }
}

// Sizes the buffers for the current model and host rate. Called with the lock held.
void NeuralTone::configure()
{
    const double mRate = active != nullptr ? rateFor (*active, hostRate) : hostRate;
    resampling = std::abs (mRate - hostRate) > 1.0;
    const int modelBlock = (int) std::ceil (maxBlock * mRate / hostRate) + 16;
    mono.assign ((size_t) maxBlock, 0.0f);
    wet.assign ((size_t) maxBlock, 0.0f);
    modelIn.assign ((size_t) modelBlock * 2, 0.0f);
    modelOut.assign ((size_t) modelBlock * 2, 0.0f);
    if (active != nullptr)
    {
        active->Reset (resampling ? mRate : hostRate, modelBlock * 2);
        // level the model the way the NAM plug-in does: aim for -18 dB
        normGain = active->HasLoudness() ? juce::Decibels::decibelsToGain ((float) (-18.0 - active->GetLoudness())) : 1.0f;
    }
    if (resampling)
    {
        up.prepare (hostRate, mRate, maxBlock);
        down.prepare (mRate, hostRate, modelBlock);
        // a little delay so the output side never runs dry (about 1 ms)
        std::vector<float> zeros ((size_t) (mRate / 1000.0) + 8, 0.0f);
        down.push (zeros.data(), (int) zeros.size());
    }
}

void NeuralTone::process (float* L, float* R, int n, const NeuralSettings& s)
{
    if (! s.on)
        return;
    const juce::SpinLock::ScopedTryLockType sl (lock);
    if (! sl.isLocked() || active == nullptr || n > maxBlock)
        return;

    const float driveGain = juce::Decibels::decibelsToGain (s.drive * 18.0f);
    inGain.setTargetValue (juce::Decibels::decibelsToGain (s.inDb) * driveGain);
    outGain.setTargetValue (juce::Decibels::decibelsToGain (s.outDb) * normGain);
    mixAmount.setTargetValue (s.mix);

    for (int i = 0; i < n; ++i)
        mono[(size_t) i] = 0.5f * (L[i] + (R != L ? R[i] : L[i])) * inGain.getNextValue();

    auto runModel = [this] (float* in, float* out, int frames)
    {
        // NAM never gets more than the block size it was set up for
        const int chunk = (int) modelIn.size() / 2;
        for (int done = 0; done < frames; done += chunk)
        {
            float* inPtr = in + done;
            float* outPtr = out + done;
            active->process (&inPtr, &outPtr, juce::jmin (chunk, frames - done));
        }
    };

    if (! resampling)
        runModel (mono.data(), wet.data(), n);
    else
    {
        up.push (mono.data(), n);
        const int m = juce::jmin (up.available(), (int) modelIn.size());
        up.pull (modelIn.data(), m);
        runModel (modelIn.data(), modelOut.data(), m);
        down.push (modelOut.data(), m);
        const int ready = juce::jmin (n, down.available());
        down.pull (wet.data(), ready);
        std::fill (wet.begin() + ready, wet.begin() + n, 0.0f);
    }

    for (int i = 0; i < n; ++i)
    {
        const float w = wet[(size_t) i] * outGain.getNextValue();
        const float mx = mixAmount.getNextValue();
        L[i] = L[i] * (1.0f - mx) + w * mx;
        if (R != L)
            R[i] = R[i] * (1.0f - mx) + w * mx;
    }
}
} // namespace kbk
