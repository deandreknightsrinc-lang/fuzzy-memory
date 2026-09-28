// Offline DSP tests for the W.O.M.P. plugins.
// Instantiates each processor without a host, renders test signals and checks invariants.

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

#include "DustProcessor.h"
#include "LowEndProcessor.h"

#include <cstdio>
#include <functional>
#include <utility>
#include <vector>

namespace
{
int failures = 0;
int checks = 0;

void check (bool ok, const juce::String& what)
{
    ++checks;
    if (! ok)
    {
        ++failures;
        std::printf ("  [FAIL] %s\n", what.toRawUTF8());
    }
}

void info (const juce::String& s) { std::printf ("%s\n", s.toRawUTF8()); }

using ParamSet = std::vector<std::pair<const char*, float>>;
using Generator = std::function<float (int channel, int sampleIndex, double sampleRate)>;

void setParam (juce::AudioProcessorValueTreeState& state, const char* id, float value)
{
    auto* param = state.getParameter (id);
    jassert (param != nullptr);
    param->setValueNotifyingHost (param->convertTo0to1 (value));
}

void resetParams (juce::AudioProcessorValueTreeState& state)
{
    for (auto* p : state.processor.getParameters())
        if (auto* rp = dynamic_cast<juce::RangedAudioParameter*> (p))
            rp->setValueNotifyingHost (rp->getDefaultValue());
}

void applyParams (juce::AudioProcessorValueTreeState& state, const ParamSet& set)
{
    resetParams (state);
    for (const auto& [id, v] : set)
        setParam (state, id, v);
}

/** Renders `numSamples` of `gen` through the processor using a rotating set of block sizes. */
juce::AudioBuffer<float> render (juce::AudioProcessor& proc, double sr, int numChannels, int numSamples,
                                 const Generator& gen, std::vector<int> blockSizes = { 512 },
                                 juce::AudioBuffer<float>* inputCopy = nullptr)
{
    juce::AudioBuffer<float> input (numChannels, numSamples);
    for (int ch = 0; ch < numChannels; ++ch)
        for (int i = 0; i < numSamples; ++i)
            input.setSample (ch, i, gen (ch, i, sr));

    if (inputCopy != nullptr)
        inputCopy->makeCopyOf (input);

    juce::AudioBuffer<float> output (input);
    juce::MidiBuffer midi;
    int pos = 0, which = 0;
    while (pos < numSamples)
    {
        const int len = juce::jmin (blockSizes[(size_t) which++ % blockSizes.size()], numSamples - pos);
        juce::AudioBuffer<float> view (output.getArrayOfWritePointers(), numChannels, pos, len);
        proc.processBlock (view, midi);
        pos += len;
    }
    return output;
}

struct Stats
{
    bool finite = true;
    float peak = 0.0f;
};

Stats analyse (const juce::AudioBuffer<float>& b, int from = 0)
{
    Stats s;
    for (int ch = 0; ch < b.getNumChannels(); ++ch)
        for (int i = from; i < b.getNumSamples(); ++i)
        {
            const float v = b.getSample (ch, i);
            if (! std::isfinite (v))
                s.finite = false;
            else
                s.peak = juce::jmax (s.peak, std::abs (v));
        }
    return s;
}

double rms (const juce::AudioBuffer<float>& b, int ch, int from)
{
    double sum = 0.0;
    for (int i = from; i < b.getNumSamples(); ++i)
        sum += (double) b.getSample (ch, i) * b.getSample (ch, i);
    return std::sqrt (sum / juce::jmax (1, b.getNumSamples() - from));
}

/** Energy above ~250 Hz (two cascaded 2nd-order high-passes). */
double highBandRms (const juce::AudioBuffer<float>& b, double sr, int from)
{
    juce::dsp::IIR::Filter<float> f1, f2;
    f1.coefficients = f2.coefficients = juce::dsp::IIR::Coefficients<float>::makeHighPass (sr, 250.0);
    double sum = 0.0;
    for (int i = 0; i < b.getNumSamples(); ++i)
    {
        const float y = f2.processSample (f1.processSample (b.getSample (0, i)));
        if (i >= from)
            sum += (double) y * y;
    }
    return std::sqrt (sum / juce::jmax (1, b.getNumSamples() - from));
}

//==============================================================================
// Test signals
float sine (double freq, double amp, int i, double sr, double phase = 0.0)
{
    return (float) (amp * std::sin (juce::MathConstants<double>::twoPi * freq * i / sr + phase));
}

float eightOhEight (int ch, int i, double sr)
{
    // Retriggers every 0.5 s: pitch glides 110 Hz -> 45 Hz, long exp decay, click on the attack.
    const int period = (int) (0.5 * sr);
    const double t = (double) (i % period) / sr;
    const double f0 = 45.0, f1 = 110.0, glide = 0.04;
    const double phase = juce::MathConstants<double>::twoPi * (f0 * t + (f1 - f0) * glide * (1.0 - std::exp (-t / glide)));
    const double env = std::exp (-t * 3.0);
    const double click = t < 0.002 ? (1.0 - t / 0.002) * 0.4 : 0.0;
    return (float) ((ch == 0 ? 1.0 : 0.95) * (env * std::sin (phase) + click));
}

float noise (int ch, int i, double)
{
    juce::Random r ((juce::int64) (i * 2 + ch) * 7919 + 17);
    return (r.nextFloat() * 2.0f - 1.0f) * 0.5f;
}

const std::vector<std::pair<juce::String, Generator>>& signals()
{
    static const std::vector<std::pair<juce::String, Generator>> list {
        { "sine 55Hz", [] (int ch, int i, double sr) { return sine (55.0, 0.8, i, sr, ch * 0.3); } },
        { "808", eightOhEight },
        { "noise", noise },
        { "impulse+silence", [] (int, int i, double) { return i == 100 ? 1.0f : 0.0f; } },
    };
    return list;
}

//==============================================================================
struct NamedSet
{
    juce::String name;
    ParamSet params;
    float bound; // max |output| allowed for test signals peaking at ~1.4
};

template <typename Processor>
void stabilityTests (const juce::String& name, const std::vector<NamedSet>& paramSets)
{
    for (const auto& [setName, set, bound] : paramSets)
    {
        float worstPeak = 0.0f;
        for (double sr : { 44100.0, 48000.0 })
            for (const auto& [sigName, gen] : signals())
            {
                Processor p;
                applyParams (p.apvts, set);
                p.prepareToPlay (sr, 512);
                // Include blocks larger than prepared (host misbehaviour) and tiny odd blocks.
                const auto out = render (p, sr, 2, (int) (sr * 2.0), gen, { 512, 1000, 17, 256, 1 });
                const auto s = analyse (out);
                const auto tag = name + " @" + juce::String ((int) sr) + " [" + setName + "] " + sigName;
                check (s.finite, tag + ": output contains NaN/Inf");
                check (s.peak < bound, tag + ": output out of bounds, peak=" + juce::String (s.peak));
                worstPeak = juce::jmax (worstPeak, s.peak);
            }
        info ("  stability [" + setName + "]: worst peak " + juce::String (worstPeak, 3) + " (bound " + juce::String (bound, 1) + ")");
    }

    // Mono bus layout.
    for (double sr : { 44100.0, 48000.0 })
    {
        Processor p;
        juce::AudioProcessor::BusesLayout mono;
        mono.inputBuses.add (juce::AudioChannelSet::mono());
        mono.outputBuses.add (juce::AudioChannelSet::mono());
        check (p.setBusesLayout (mono), name + ": mono layout accepted");
        p.prepareToPlay (sr, 256);
        const auto out = render (p, sr, 1, (int) sr, eightOhEight, { 256 });
        const auto s = analyse (out);
        check (s.finite && s.peak < 2.0f, name + " mono: finite & bounded (peak=" + juce::String (s.peak) + ")");
    }
}

template <typename Processor>
void mixZeroTest (const juce::String& name, const ParamSet& extra)
{
    for (double sr : { 44100.0, 48000.0 })
    {
        Processor p;
        ParamSet set = extra;
        set.emplace_back ("mix", 0.0f);
        set.emplace_back ("output", 0.0f);
        applyParams (p.apvts, set);
        p.prepareToPlay (sr, 512);
        const int latency = p.getLatencySamples();

        juce::AudioBuffer<float> in;
        const auto out = render (p, sr, 2, (int) sr, noise, { 512, 333 }, &in);

        float maxErr = 0.0f;
        for (int ch = 0; ch < 2; ++ch)
            for (int i = 0; i < out.getNumSamples(); ++i)
            {
                const float expected = i >= latency ? in.getSample (ch, i - latency) : 0.0f;
                maxErr = juce::jmax (maxErr, std::abs (out.getSample (ch, i) - expected));
            }

        check (maxErr < 1.0e-5f, name + " @" + juce::String ((int) sr) + ": Mix=0 passes dry delayed by latency ("
                                     + juce::String (latency) + " smp), maxErr=" + juce::String (maxErr));
        info ("  mix=0 @" + juce::String ((int) sr) + ": latency=" + juce::String (latency) + " maxErr=" + juce::String (maxErr));
    }
}

template <typename Processor>
void stateTest (const juce::String& name)
{
    juce::Random rng (42);
    Processor a;
    std::vector<float> expected;
    for (auto* p : a.getParameters())
    {
        p->setValueNotifyingHost (0.1f + 0.8f * rng.nextFloat());
        expected.push_back (p->getValue()); // choice params quantise, so read back
    }

    juce::MemoryBlock state;
    a.getStateInformation (state);

    // Scramble, then restore into the same instance.
    for (auto* p : a.getParameters())
        p->setValueNotifyingHost (p->getValue() > 0.5f ? 0.0f : 1.0f);
    a.setStateInformation (state.getData(), (int) state.getSize());

    // ...and into a fresh instance.
    Processor b;
    b.setStateInformation (state.getData(), (int) state.getSize());

    const auto& pa = a.getParameters();
    const auto& pb = b.getParameters();
    bool okA = true, okB = true;
    for (size_t i = 0; i < expected.size(); ++i)
    {
        if (std::abs (pa[(int) i]->getValue() - expected[i]) > 1.0e-4f)
        {
            okA = false;
            info ("    mismatch (same instance) " + pa[(int) i]->getName (64));
        }
        if (std::abs (pb[(int) i]->getValue() - expected[i]) > 1.0e-4f)
        {
            okB = false;
            info ("    mismatch (fresh instance) " + pb[(int) i]->getName (64));
        }
    }
    check (okA, name + ": state round-trip (same instance)");
    check (okB, name + ": state round-trip (fresh instance)");
    check (expected.size() == (size_t) pa.size() && ! expected.empty(), name + ": has parameters");
    info ("  state round-trip: " + juce::String ((int) expected.size()) + " params");
}

//==============================================================================
void lowEndSpecificTests()
{
    using namespace LowEndIDs;

    for (double sr : { 44100.0, 48000.0 })
    {
        const auto tag = "LowEnd @" + juce::String ((int) sr);

        // Latency: 4x FIR oversampling must be reported.
        {
            WompLowEndProcessor p;
            p.prepareToPlay (sr, 512);
            check (p.getLatencySamples() > 0, tag + ": reports oversampling latency");
            info ("  latency @" + juce::String ((int) sr) + " = " + juce::String (p.getLatencySamples()) + " samples");
        }

        // Wet path alignment: with everything neutral, the output/input cross-correlation must peak at the
        // reported latency (i.e. the high band and the oversampled low band are time-aligned with the report).
        {
            WompLowEndProcessor p;
            applyParams (p.apvts, { { drive, 0.0f }, { harmonics, 0.0f }, { punch, 0.0f }, { subBoost, 0.0f },
                                    { tight, 20.0f }, { monoBelow, 0.0f }, { mix, 100.0f } });
            p.prepareToPlay (sr, 512);
            juce::AudioBuffer<float> in;
            const auto out = render (p, sr, 2, (int) sr, noise, { 512 }, &in);
            int bestLag = -1;
            double best = -1.0;
            for (int lag = 0; lag < 256; ++lag)
            {
                double acc = 0.0;
                for (int i = 4096; i < out.getNumSamples(); ++i)
                    acc += (double) out.getSample (0, i) * in.getSample (0, i - lag);
                if (acc > best)
                {
                    best = acc;
                    bestLag = lag;
                }
            }
            check (bestLag == p.getLatencySamples(), tag + ": wet path peak lag " + juce::String (bestLag)
                                                         + " == reported latency " + juce::String (p.getLatencySamples()));
            info ("  wet alignment @" + juce::String ((int) sr) + ": xcorr peak lag " + juce::String (bestLag));
        }

        // Mono Below: a stereo 40 Hz sine with different L/R amplitude & phase must come out identical in L/R.
        const Generator stereoLow = [] (int ch, int i, double rate) {
            return ch == 0 ? sine (40.0, 0.5, i, rate) : sine (40.0, 0.3, i, rate, 1.2);
        };
        const ParamSet clean { { drive, 0.0f }, { harmonics, 0.0f }, { punch, 0.0f }, { subBoost, 0.0f },
                               { tight, 20.0f }, { mix, 100.0f }, { output, 0.0f } };

        auto measureDiff = [&] (int monoIndex) {
            WompLowEndProcessor p;
            auto set = clean;
            set.emplace_back (monoBelow, (float) monoIndex);
            applyParams (p.apvts, set);
            p.prepareToPlay (sr, 512);
            const auto out = render (p, sr, 2, (int) (sr * 2.0), stereoLow);
            float diff = 0.0f;
            for (int i = (int) sr; i < out.getNumSamples(); ++i)
                diff = juce::jmax (diff, std::abs (out.getSample (0, i) - out.getSample (1, i)));
            return diff;
        };

        const float diffMono = measureDiff (6); // 200 Hz
        const float diffMono120 = measureDiff (4); // 120 Hz
        const float diffOff = measureDiff (0);
        check (diffMono < 0.01f, tag + ": Mono Below 200 Hz makes 40 Hz L==R (maxDiff=" + juce::String (diffMono) + ")");
        check (diffMono120 < 0.02f, tag + ": Mono Below 120 Hz makes 40 Hz L==R (maxDiff=" + juce::String (diffMono120) + ")");
        check (diffOff > 0.1f, tag + ": Mono Below Off keeps stereo (maxDiff=" + juce::String (diffOff) + ")");
        info ("  mono-below @" + juce::String ((int) sr) + ": |L-R| 200Hz=" + juce::String (diffMono, 6)
              + " 120Hz=" + juce::String (diffMono120, 6) + " off=" + juce::String (diffOff, 4));

        // Drive: 45 Hz sine gains audible upper harmonics (phone speakers) while RMS stays close (auto gain).
        auto driveRender = [&] (float driveAmt, double& hiRms, double& fullRms, double& inRms) {
            WompLowEndProcessor p;
            applyParams (p.apvts, { { drive, driveAmt }, { harmonics, 100.0f }, { punch, 0.0f }, { subBoost, 0.0f },
                                    { tight, 20.0f }, { monoBelow, 0.0f }, { mix, 100.0f } });
            p.prepareToPlay (sr, 512);
            juce::AudioBuffer<float> in;
            const auto out = render (p, sr, 2, (int) (sr * 2.0), [] (int, int i, double rate) { return sine (45.0, 0.7, i, rate); },
                                     { 512 }, &in);
            hiRms = highBandRms (out, sr, (int) sr);
            fullRms = rms (out, 0, (int) sr);
            inRms = rms (in, 0, (int) sr);
        };
        double hi0 = 0, full0 = 0, in0 = 0, hi1 = 0, full1 = 0, in1 = 0;
        driveRender (0.0f, hi0, full0, in0);
        driveRender (80.0f, hi1, full1, in1);
        const double levelDb = juce::Decibels::gainToDecibels (full1 / in1);
        check (hi1 > hi0 * 10.0, tag + ": Drive adds harmonics above 250 Hz (" + juce::String (hi0, 6) + " -> " + juce::String (hi1, 6) + ")");
        check (std::abs (levelDb) < 4.0, tag + ": auto gain keeps level within 4 dB (" + juce::String (levelDb, 2) + " dB)");
        info ("  drive @" + juce::String ((int) sr) + ": >250Hz rms " + juce::String (hi0, 6) + " -> " + juce::String (hi1, 5)
              + ", level change " + juce::String (levelDb, 2) + " dB");
    }
}

void dustSpecificTests()
{
    using namespace DustIDs;
    for (double sr : { 44100.0, 48000.0 })
    {
        const auto tag = "Dust @" + juce::String ((int) sr);
        WompDustProcessor p;
        p.prepareToPlay (sr, 512);
        check (p.getLatencySamples() == WompDustProcessor::centreDelaySamples (sr), tag + ": latency == wow/flutter centre delay");
        info ("  latency @" + juce::String ((int) sr) + " = " + juce::String (p.getLatencySamples()) + " samples");

        // Crackle must be stereo-decorrelated: render silence with only crackle on.
        WompDustProcessor c;
        applyParams (c.apvts, { { tapeDrive, 0.0f }, { wow, 0.0f }, { flutter, 0.0f }, { hiss, 0.0f }, { crackle, 100.0f },
                                { lowCut, 20.0f }, { highCut, 20000.0f }, { age, 0.0f }, { mix, 100.0f } });
        c.prepareToPlay (sr, 512);
        const auto out = render (c, sr, 2, (int) (sr * 3.0), [] (int, int, double) { return 0.0f; });
        double sl = 0, sr2 = 0, slr = 0;
        for (int i = 0; i < out.getNumSamples(); ++i)
        {
            const double l = out.getSample (0, i), r = out.getSample (1, i);
            sl += l * l;
            sr2 += r * r;
            slr += l * r;
        }
        const double corr = slr / std::sqrt (sl * sr2 + 1e-30);
        check (sl > 1e-6 && sr2 > 1e-6, tag + ": crackle produces signal");
        check (std::abs (corr) < 0.2, tag + ": crackle L/R decorrelated (corr=" + juce::String (corr, 4) + ")");
        info ("  crackle @" + juce::String ((int) sr) + ": L/R correlation " + juce::String (corr, 4));
    }
}

} // namespace

/** Renders an editor offscreen to PNG (no window / display needed). Also exercises editor construction. */
template <typename Processor>
void snapshotEditor (const juce::File& dir, const juce::String& fileName)
{
    Processor p;
    std::unique_ptr<juce::AudioProcessorEditor> editor (p.createEditor());
    check (editor != nullptr && editor->getWidth() > 0 && editor->getHeight() > 0, fileName + ": editor created");
    const auto image = editor->createComponentSnapshot (editor->getLocalBounds(), true, 2.0f);
    juce::PNGImageFormat png;
    const auto file = dir.getChildFile (fileName);
    file.deleteFile();
    juce::FileOutputStream out (file);
    check (out.openedOk() && png.writeImageToStream (image, out), fileName + ": snapshot written");
    info ("  wrote " + file.getFullPathName());
}

//==============================================================================
int main (int argc, char** argv)
{
    juce::ScopedJuceInitialiser_GUI juceInit;

    // Optional: WompTests --snapshot <dir>  => also render both editors to PNG.
    if (argc >= 3 && juce::String (argv[1]) == "--snapshot")
    {
        const juce::File dir (juce::File::getCurrentWorkingDirectory().getChildFile (argv[2]));
        dir.createDirectory();
        info ("== Editor snapshots ==");
        snapshotEditor<WompLowEndProcessor> (dir, "WompLowEnd.png");
        snapshotEditor<WompDustProcessor> (dir, "WompDust.png");
    }

    using namespace LowEndIDs;
    info ("== WOMP Low End ==");
    stabilityTests<WompLowEndProcessor> (
        "LowEnd",
        { { "defaults", {}, 2.0f },
          { "max", { { drive, 100.0f }, { harmonics, 100.0f }, { subBoost, 6.0f }, { monoBelow, 6.0f },
                     { punch, 100.0f }, { tight, 40.0f }, { mix, 100.0f }, { output, 0.0f } }, 8.0f },
          { "min", { { drive, 0.0f }, { harmonics, 0.0f }, { subBoost, 0.0f }, { monoBelow, 0.0f },
                     { punch, 0.0f }, { tight, 20.0f }, { mix, 0.0f }, { output, -24.0f } }, 2.0f } });
    mixZeroTest<WompLowEndProcessor> ("LowEnd", { { drive, 100.0f }, { punch, 100.0f }, { subBoost, 6.0f } });
    stateTest<WompLowEndProcessor> ("LowEnd");
    lowEndSpecificTests();

    info ("== WOMP Dust ==");
    stabilityTests<WompDustProcessor> (
        "Dust",
        { { "defaults", {}, 2.0f },
          { "max", { { DustIDs::tapeDrive, 100.0f }, { DustIDs::wow, 100.0f }, { DustIDs::flutter, 100.0f },
                     { DustIDs::crackle, 100.0f }, { DustIDs::hiss, 100.0f }, { DustIDs::lowCut, 300.0f },
                     { DustIDs::highCut, 4000.0f }, { DustIDs::age, 100.0f }, { DustIDs::mix, 100.0f },
                     { DustIDs::output, 0.0f } }, 4.0f },
          { "min", { { DustIDs::tapeDrive, 0.0f }, { DustIDs::wow, 0.0f }, { DustIDs::flutter, 0.0f },
                     { DustIDs::crackle, 0.0f }, { DustIDs::hiss, 0.0f }, { DustIDs::lowCut, 20.0f },
                     { DustIDs::highCut, 20000.0f }, { DustIDs::age, 0.0f }, { DustIDs::mix, 0.0f },
                     { DustIDs::output, -24.0f } }, 2.0f } });
    mixZeroTest<WompDustProcessor> ("Dust", { { DustIDs::crackle, 100.0f }, { DustIDs::hiss, 100.0f }, { DustIDs::wow, 100.0f } });
    stateTest<WompDustProcessor> ("Dust");
    dustSpecificTests();

    std::printf ("\n%d checks, %d failures\n", checks, failures);
    std::printf (failures == 0 ? "ALL TESTS PASSED\n" : "TESTS FAILED\n");
    return failures == 0 ? 0 : 1;
}
