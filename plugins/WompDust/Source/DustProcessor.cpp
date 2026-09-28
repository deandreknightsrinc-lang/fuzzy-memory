#include "DustProcessor.h"
#include "DustEditor.h"

namespace
{
juce::String percentText (float v, int) { return juce::String (juce::roundToInt (v)) + " %"; }
juce::String dbText (float v, int) { return (v > 0.0f ? "+" : "") + juce::String (v, 1) + " dB"; }
juce::String hzText (float v, int)
{
    return v >= 1000.0f ? juce::String (v / 1000.0f, v >= 10000.0f ? 1 : 2) + " kHz"
                        : juce::String (juce::roundToInt (v)) + " Hz";
}

std::unique_ptr<juce::AudioParameterFloat> makePercent (const char* id, const char* name, float def)
{
    return std::make_unique<juce::AudioParameterFloat> (
        juce::ParameterID { id, DustIDs::version }, name, juce::NormalisableRange<float> (0.0f, 100.0f, 0.1f), def,
        juce::AudioParameterFloatAttributes().withLabel ("%").withStringFromValueFunction (percentText));
}

std::unique_ptr<juce::AudioParameterFloat> makeHz (const char* id, const char* name, float lo, float hi, float def)
{
    juce::NormalisableRange<float> range (lo, hi, 1.0f);
    range.setSkewForCentre (std::sqrt (lo * hi)); // log-like feel
    return std::make_unique<juce::AudioParameterFloat> (
        juce::ParameterID { id, DustIDs::version }, name, range, def,
        juce::AudioParameterFloatAttributes().withLabel ("Hz").withStringFromValueFunction (hzText));
}
} // namespace

//==============================================================================
void CrackleGenerator::prepare (double sampleRate, uint32_t seed)
{
    sr = sampleRate;
    rng = womp::FastRandom (seed);
    clickEnv = popEnv = popLp = clickHpState = surfaceHpState = 0.0f;
    clickDecay = popDecay = 0.0f;
    popLpCoeff = womp::onePoleCoeffHz (sr, 1200.0);
    hpCoeff = womp::onePoleCoeffHz (sr, 700.0);
}

float CrackleGenerator::process (float amount) noexcept
{
    const auto fsr = (float) sr;

    // Clicks: dense, tiny, mostly quiet with the occasional louder tick (cubic amplitude distribution).
    const float clickRate = 4.0f + 110.0f * amount * amount; // events per second
    if (rng.unipolar() < clickRate / fsr)
    {
        const float u = rng.unipolar();
        const float amp = amount * (0.015f + 0.35f * u * u * u);
        if (amp > clickEnv)
        {
            clickEnv = amp;
            const float seconds = 0.00008f + 0.0005f * rng.unipolar();
            clickDecay = std::exp (-1.0f / (seconds * fsr));
        }
    }

    // Pops: rarer, lower, longer.
    const float popRate = 0.15f + 1.6f * amount;
    if (rng.unipolar() < amount * popRate / fsr)
    {
        const float amp = amount * (0.12f + 0.3f * rng.unipolar());
        if (amp > popEnv)
        {
            popEnv = amp;
            const float seconds = 0.0015f + 0.003f * rng.unipolar();
            popDecay = std::exp (-1.0f / (seconds * fsr));
        }
    }

    const float click = clickEnv * rng.bipolar();
    clickEnv *= clickDecay;
    clickHpState += hpCoeff * (click - clickHpState);

    popLp += popLpCoeff * (popEnv * rng.bipolar() - popLp);
    popEnv *= popDecay;

    const float surface = 0.004f * amount * rng.bipolar();
    surfaceHpState += hpCoeff * (surface - surfaceHpState);

    return (click - clickHpState) + 2.5f * popLp + (surface - surfaceHpState);
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout WompDustProcessor::createParameterLayout()
{
    using namespace DustIDs;
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    layout.add (makePercent (tapeDrive, "Tape Drive", 30.0f));
    layout.add (makePercent (wow, "Wow", 20.0f));
    layout.add (makePercent (flutter, "Flutter", 15.0f));
    layout.add (makePercent (crackle, "Crackle", 20.0f));
    layout.add (makePercent (hiss, "Hiss", 10.0f));
    layout.add (makeHz (lowCut, "Low Cut", 20.0f, 300.0f, 40.0f));
    layout.add (makeHz (highCut, "High Cut", 4000.0f, 20000.0f, 12000.0f));
    layout.add (makePercent (age, "Age", 0.0f));
    layout.add (makePercent (mix, "Mix", 100.0f));
    layout.add (std::make_unique<juce::AudioParameterFloat> (
        juce::ParameterID { output, version }, "Output", juce::NormalisableRange<float> (-24.0f, 12.0f, 0.01f), 0.0f,
        juce::AudioParameterFloatAttributes().withLabel ("dB").withStringFromValueFunction (dbText)));
    return layout;
}

int WompDustProcessor::centreDelaySamples (double sr)
{
    return (int) std::ceil ((kWowDepthSeconds + kFlutterDepthSeconds) * sr) + 4;
}

WompDustProcessor::WompDustProcessor()
    : AudioProcessor (BusesProperties()
                          .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                          .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "WompDust", createParameterLayout())
{
    using namespace DustIDs;
    pTapeDrive = apvts.getRawParameterValue (tapeDrive);
    pWow       = apvts.getRawParameterValue (wow);
    pFlutter   = apvts.getRawParameterValue (flutter);
    pCrackle   = apvts.getRawParameterValue (crackle);
    pHiss      = apvts.getRawParameterValue (hiss);
    pLowCut    = apvts.getRawParameterValue (lowCut);
    pHighCut   = apvts.getRawParameterValue (highCut);
    pAge       = apvts.getRawParameterValue (age);
    pMix       = apvts.getRawParameterValue (mix);
    pOutput    = apvts.getRawParameterValue (output);

    centreDelay = centreDelaySamples (sampleRate);
    setLatencySamples (centreDelay);
}

void WompDustProcessor::prepareToPlay (double newSampleRate, int samplesPerBlock)
{
    sampleRate = newSampleRate;
    centreDelay = centreDelaySamples (sampleRate);
    setLatencySamples (centreDelay);

    const juce::dsp::ProcessSpec spec { sampleRate, (juce::uint32) juce::jmax (1, samplesPerBlock), 2 };

    tapeDelay.setMaximumDelayInSamples (centreDelay * 2 + 8);
    tapeDelay.prepare (spec);
    tapeDelay.reset();

    lowCutFilter.prepare (spec);
    lowCutFilter.setType (juce::dsp::StateVariableTPTFilterType::highpass);
    lowCutFilter.setResonance (1.0f / juce::MathConstants<float>::sqrt2);

    highCutFilter.prepare (spec);
    highCutFilter.setType (juce::dsp::StateVariableTPTFilterType::lowpass);
    highCutFilter.setResonance (0.85f); // a touch of vintage "presence" bump before the roll-off

    dryDelay.prepare (2, centreDelay);

    crackles[0].prepare (sampleRate, 0xC0FFEEu);
    crackles[1].prepare (sampleRate, 0xBADA55u);
    hissLp.fill (0.0f);
    hissLpCoeff = womp::onePoleCoeffHz (sampleRate, 1500.0);

    wowPhase = flutterPhase = 0.0;
    wowDrift.prepare (sampleRate, 1.5, 0x51u);
    flutterDrift.prepare (sampleRate, 0.08, 0x77u);

    auto initSmooth = [this] (auto& s, float value) {
        s.reset (sampleRate, 0.05);
        s.setCurrentAndTargetValue (value);
    };
    initSmooth (driveSmooth, pTapeDrive->load() * 0.01f);
    initSmooth (wowSmooth, pWow->load() * 0.01f);
    initSmooth (flutterSmooth, pFlutter->load() * 0.01f);
    initSmooth (crackleSmooth, pCrackle->load() * 0.01f);
    initSmooth (hissSmooth, pHiss->load() * 0.01f);
    initSmooth (ageSmooth, pAge->load() * 0.01f);
    initSmooth (mixSmooth, pMix->load() * 0.01f);
    initSmooth (lowCutSmooth, pLowCut->load());
    initSmooth (highCutSmooth, pHighCut->load());
    initSmooth (outputSmooth, juce::Decibels::decibelsToGain (pOutput->load()));
}

void WompDustProcessor::releaseResources() {}

bool WompDustProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto& out = layouts.getMainOutputChannelSet();
    if (out != juce::AudioChannelSet::mono() && out != juce::AudioChannelSet::stereo())
        return false;
    return layouts.getMainInputChannelSet() == out;
}

//==============================================================================
void WompDustProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    const int numIn = getTotalNumInputChannels();
    for (int ch = numIn; ch < getTotalNumOutputChannels(); ++ch)
        buffer.clear (ch, 0, buffer.getNumSamples());

    const int numCh = juce::jmin (buffer.getNumChannels(), 2);
    const int n = buffer.getNumSamples();
    if (numCh == 0)
        return;

    driveSmooth.setTargetValue (pTapeDrive->load() * 0.01f);
    wowSmooth.setTargetValue (pWow->load() * 0.01f);
    flutterSmooth.setTargetValue (pFlutter->load() * 0.01f);
    crackleSmooth.setTargetValue (pCrackle->load() * 0.01f);
    hissSmooth.setTargetValue (pHiss->load() * 0.01f);
    ageSmooth.setTargetValue (pAge->load() * 0.01f);
    mixSmooth.setTargetValue (pMix->load() * 0.01f);
    lowCutSmooth.setTargetValue (pLowCut->load());
    highCutSmooth.setTargetValue (pHighCut->load());
    outputSmooth.setTargetValue (juce::Decibels::decibelsToGain (pOutput->load()));

    const double wowInc = juce::MathConstants<double>::twoPi * 0.5 / sampleRate;
    const double flutterInc = juce::MathConstants<double>::twoPi * 6.5 / sampleRate;
    const float wowDepth = (float) (kWowDepthSeconds * sampleRate);
    const float flutterDepth = (float) (kFlutterDepthSeconds * sampleRate);
    const float maxCutoff = (float) (sampleRate * 0.45);

    auto* const* channels = buffer.getArrayOfWritePointers();

    for (int i = 0; i < n; ++i)
    {
        const float drive = driveSmooth.getNextValue();
        const float ageAmt = ageSmooth.getNextValue();
        const float wowAmt = wowSmooth.getNextValue();
        const float flutterAmt = flutterSmooth.getNextValue();
        const float crackleAmt = crackleSmooth.getNextValue();
        const float hissAmt = hissSmooth.getNextValue();
        const float mix = mixSmooth.getNextValue();
        const float outGain = outputSmooth.getNextValue();
        const float lc = lowCutSmooth.getNextValue();
        const float hc = highCutSmooth.getNextValue();

        // Age: one macro that pushes wow, flutter, crackle and band-limiting further toward "worn".
        const float wowEff = wowAmt + ageAmt * (1.0f - wowAmt) * 0.6f;
        const float flutterEff = flutterAmt + ageAmt * (1.0f - flutterAmt) * 0.5f;
        const float crackleEff = crackleAmt + ageAmt * (1.0f - crackleAmt) * 0.5f;

        if ((i & 15) == 0)
        {
            const float lcEff = lc * std::pow (juce::jmax (lc, 150.0f) / lc, ageAmt * 0.7f);
            const float hcEff = hc * std::pow (juce::jmin (hc, 4500.0f) / hc, ageAmt * 0.7f);
            lowCutFilter.setCutoffFrequency (juce::jlimit (10.0f, maxCutoff, lcEff));
            highCutFilter.setCutoffFrequency (juce::jlimit (1000.0f, maxCutoff, hcEff));
        }

        // Transport modulation is shared by both channels (one tape, one turntable).
        wowPhase += wowInc;
        if (wowPhase >= juce::MathConstants<double>::twoPi)
            wowPhase -= juce::MathConstants<double>::twoPi;
        flutterPhase += flutterInc;
        if (flutterPhase >= juce::MathConstants<double>::twoPi)
            flutterPhase -= juce::MathConstants<double>::twoPi;

        const float wowMod = juce::jlimit (-1.0f, 1.0f, 0.75f * (float) std::sin (wowPhase) + 0.25f * wowDrift.next());
        const float flutterMod = juce::jlimit (-1.0f, 1.0f, 0.65f * (float) std::sin (flutterPhase) + 0.35f * flutterDrift.next());
        const float delay = (float) centreDelay + wowEff * wowDepth * wowMod + flutterEff * flutterDepth * flutterMod;

        // Tape saturation with gentle asymmetry (even harmonics); unity-ish small-signal gain.
        const float g = 1.0f + 3.0f * drive;
        const float bias = 0.15f * drive;
        const float tb = std::tanh (bias);
        const float comp = std::pow (g, -0.75f);
        const float wetTape = std::sqrt (drive);
        const float hissGain = hissAmt * hissAmt * 0.03f;

        for (int ch = 0; ch < numCh; ++ch)
        {
            const float x = channels[ch][i];
            const float dry = dryDelay.process (ch, x);

            tapeDelay.pushSample (ch, x);
            float w = tapeDelay.popSample (ch, delay, true);

            const float sat = (std::tanh (g * w + bias) - tb) * comp;
            w += wetTape * (sat - w);

            // Noise floor: tape hiss (tilted white) and vinyl crackle, each channel independent.
            const float white = hissRng[(size_t) ch].bipolar();
            hissLp[(size_t) ch] += hissLpCoeff * (white - hissLp[(size_t) ch]);
            w += hissGain * (white - 0.7f * hissLp[(size_t) ch]);
            w += crackles[(size_t) ch].process (crackleEff);

            // Vintage band-limiting (also removes DC introduced by the asymmetric saturation).
            w = lowCutFilter.processSample (ch, w);
            w = highCutFilter.processSample (ch, w);

            channels[ch][i] = (dry + mix * (w - dry)) * outGain;
        }
    }
}

//==============================================================================
void WompDustProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    const auto state = apvts.copyState();
    if (auto xml = state.createXml())
        copyXmlToBinary (*xml, destData);
}

void WompDustProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
        if (xml->hasTagName (apvts.state.getType()))
            apvts.replaceState (juce::ValueTree::fromXml (*xml));
}

juce::AudioProcessorEditor* WompDustProcessor::createEditor()
{
    return new WompDustEditor (*this);
}

#if ! WOMP_TEST_BUILD
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new WompDustProcessor();
}
#endif
