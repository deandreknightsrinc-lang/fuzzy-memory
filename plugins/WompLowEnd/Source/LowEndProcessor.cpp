#include "LowEndProcessor.h"
#include "LowEndEditor.h"

namespace
{
juce::String percentText (float v, int) { return juce::String (juce::roundToInt (v)) + " %"; }
juce::String dbText (float v, int) { return (v > 0.0f ? "+" : "") + juce::String (v, 1) + " dB"; }
juce::String hzText (float v, int) { return juce::String (juce::roundToInt (v)) + " Hz"; }

std::unique_ptr<juce::AudioParameterFloat> makePercent (const char* id, const char* name, float def)
{
    return std::make_unique<juce::AudioParameterFloat> (
        juce::ParameterID { id, LowEndIDs::version }, name, juce::NormalisableRange<float> (0.0f, 100.0f, 0.1f), def,
        juce::AudioParameterFloatAttributes().withLabel ("%").withStringFromValueFunction (percentText));
}
} // namespace

//==============================================================================
const juce::StringArray& WompLowEndProcessor::monoBelowChoices()
{
    static const juce::StringArray choices { "Off", "60 Hz", "80 Hz", "100 Hz", "120 Hz", "150 Hz", "200 Hz" };
    return choices;
}

float WompLowEndProcessor::monoBelowFrequency (int index)
{
    static constexpr float freqs[] { 0.0f, 60.0f, 80.0f, 100.0f, 120.0f, 150.0f, 200.0f };
    return freqs[juce::jlimit (0, 6, index)];
}

juce::AudioProcessorValueTreeState::ParameterLayout WompLowEndProcessor::createParameterLayout()
{
    using namespace LowEndIDs;
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    layout.add (makePercent (drive, "Drive", 35.0f));
    layout.add (makePercent (harmonics, "Harmonics Mix", 70.0f));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        juce::ParameterID { subBoost, version }, "Sub Boost", juce::NormalisableRange<float> (0.0f, 6.0f, 0.01f), 2.0f,
        juce::AudioParameterFloatAttributes().withLabel ("dB").withStringFromValueFunction (dbText)));

    layout.add (std::make_unique<juce::AudioParameterChoice> (
        juce::ParameterID { monoBelow, version }, "Mono Below", monoBelowChoices(), 3));

    layout.add (makePercent (punch, "Punch", 25.0f));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        juce::ParameterID { tight, version }, "Tight", juce::NormalisableRange<float> (20.0f, 40.0f, 0.1f), 25.0f,
        juce::AudioParameterFloatAttributes().withLabel ("Hz").withStringFromValueFunction (hzText)));

    layout.add (std::make_unique<juce::AudioParameterFloat> (
        juce::ParameterID { output, version }, "Output", juce::NormalisableRange<float> (-24.0f, 12.0f, 0.01f), 0.0f,
        juce::AudioParameterFloatAttributes().withLabel ("dB").withStringFromValueFunction (dbText)));

    layout.add (makePercent (mix, "Mix", 100.0f));
    return layout;
}

//==============================================================================
WompLowEndProcessor::WompLowEndProcessor()
    : AudioProcessor (BusesProperties()
                          .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                          .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "WompLowEnd", createParameterLayout()),
      oversampler (2, kOversamplingOrder, juce::dsp::Oversampling<float>::filterHalfBandFIREquiripple, true, true)
{
    using namespace LowEndIDs;
    pDrive     = apvts.getRawParameterValue (drive);
    pHarmonics = apvts.getRawParameterValue (harmonics);
    pSubBoost  = apvts.getRawParameterValue (subBoost);
    pMonoBelow = apvts.getRawParameterValue (monoBelow);
    pPunch     = apvts.getRawParameterValue (punch);
    pTight     = apvts.getRawParameterValue (tight);
    pOutput    = apvts.getRawParameterValue (output);
    pMix       = apvts.getRawParameterValue (mix);

    // The FIR oversampler's latency is fixed (in base-rate samples) regardless of sample rate.
    latency = (int) std::lround (oversampler.getLatencyInSamples());
    setLatencySamples (latency);
}

void WompLowEndProcessor::prepareToPlay (double newSampleRate, int samplesPerBlock)
{
    sampleRate = newSampleRate;
    maxBlockSize = juce::jmax (1, samplesPerBlock);

    oversampler.reset();
    oversampler.initProcessing ((size_t) maxBlockSize);
    latency = (int) std::lround (oversampler.getLatencyInSamples());
    setLatencySamples (latency);

    const juce::dsp::ProcessSpec spec { sampleRate, (juce::uint32) maxBlockSize, 2 };

    tightFilter.prepare (spec);
    tightFilter.setType (juce::dsp::StateVariableTPTFilterType::highpass);
    tightFilter.setResonance (1.0f / juce::MathConstants<float>::sqrt2);
    tightFilter.setCutoffFrequency (pTight->load());

    splitFilter.prepare (spec);
    splitFilter.setCutoffFrequency (kSplitFrequency);

    monoFilter.prepare (spec);
    currentMonoFreq = juce::jmax (60.0f, monoBelowFrequency ((int) pMonoBelow->load()));
    monoFilter.setCutoffFrequency (currentMonoFreq);
    monoWasActive = false;

    subShelf.reset();
    currentSubGainDb = -1000.0f;
    updateSubShelf (pSubBoost->load());

    dcBlocker.prepare (sampleRate);
    dryDelay.prepare (2, latency);
    highDelay.prepare (2, latency);

    dryBuffer.setSize (2, maxBlockSize, false, true, false);
    lowBuffer.setSize (2, maxBlockSize, false, true, false);
    highBuffer.setSize (2, maxBlockSize, false, true, false);

    auto initSmooth = [this] (auto& s, float value, double seconds) {
        s.reset (sampleRate, seconds);
        s.setCurrentAndTargetValue (value);
    };
    initSmooth (driveSmooth, pDrive->load() * 0.01f, 0.05);
    initSmooth (harmonicsSmooth, pHarmonics->load() * 0.01f, 0.05);
    initSmooth (punchSmooth, pPunch->load() * 0.01f, 0.05);
    initSmooth (subSmooth, pSubBoost->load(), 0.05);
    initSmooth (tightSmooth, pTight->load(), 0.05);
    initSmooth (mixSmooth, pMix->load() * 0.01f, 0.05);
    initSmooth (outputSmooth, juce::Decibels::decibelsToGain (pOutput->load()), 0.05);

    fastEnv = slowEnv = 0.0f;
    fastAttack  = womp::onePoleCoeff (sampleRate, 0.0005);
    fastRelease = womp::onePoleCoeff (sampleRate, 0.080);
    slowAttack  = womp::onePoleCoeff (sampleRate, 0.030);
    slowRelease = womp::onePoleCoeff (sampleRate, 0.080);

    const double osRate = sampleRate * (double) oversampler.getOversamplingFactor();
    powerCoeff = womp::onePoleCoeff (osRate, 0.15);
    inPower = outPower = 0.0f;
}

void WompLowEndProcessor::releaseResources() {}

bool WompLowEndProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto& out = layouts.getMainOutputChannelSet();
    if (out != juce::AudioChannelSet::mono() && out != juce::AudioChannelSet::stereo())
        return false;
    return layouts.getMainInputChannelSet() == out;
}

void WompLowEndProcessor::updateSubShelf (float gainDb)
{
    if (std::abs (gainDb - currentSubGainDb) < 0.005f)
        return;
    currentSubGainDb = gainDb;
    subShelf.setLowShelf (sampleRate, 60.0, 0.707, (double) gainDb);
}

//==============================================================================
void WompLowEndProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
    juce::ScopedNoDenormals noDenormals;

    const int numIn = getTotalNumInputChannels();
    for (int ch = numIn; ch < getTotalNumOutputChannels(); ++ch)
        buffer.clear (ch, 0, buffer.getNumSamples());

    const int numChannels = juce::jmin (buffer.getNumChannels(), 2);
    if (numChannels == 0)
        return;

    juce::dsp::AudioBlock<float> block (buffer);
    block = block.getSubsetChannelBlock (0, (size_t) numChannels);

    const auto total = block.getNumSamples();
    for (size_t start = 0; start < total; start += (size_t) maxBlockSize)
        processChunk (block.getSubBlock (start, juce::jmin ((size_t) maxBlockSize, total - start)));
}

void WompLowEndProcessor::processChunk (juce::dsp::AudioBlock<float> block)
{
    const int n = (int) block.getNumSamples();
    const int numCh = (int) block.getNumChannels();

    driveSmooth.setTargetValue (pDrive->load() * 0.01f);
    harmonicsSmooth.setTargetValue (pHarmonics->load() * 0.01f);
    punchSmooth.setTargetValue (pPunch->load() * 0.01f);
    subSmooth.setTargetValue (pSubBoost->load());
    tightSmooth.setTargetValue (pTight->load());
    mixSmooth.setTargetValue (pMix->load() * 0.01f);
    outputSmooth.setTargetValue (juce::Decibels::decibelsToGain (pOutput->load()));

    // 1) Dry copy (latency-aligned), Tight high-pass, low/high split.
    for (int i = 0; i < n; ++i)
    {
        if ((i & 15) == 0)
            tightFilter.setCutoffFrequency (tightSmooth.skip (juce::jmin (16, n - i)));

        for (int ch = 0; ch < numCh; ++ch)
        {
            const float x = block.getSample (ch, i);
            dryBuffer.setSample (ch, i, dryDelay.process (ch, x));

            float lo = 0.0f, hi = 0.0f;
            splitFilter.processSample (ch, tightFilter.processSample (ch, x), lo, hi);
            lowBuffer.setSample (ch, i, lo);
            highBuffer.setSample (ch, i, highDelay.process (ch, hi));
        }
    }

    // 2) Punch: transient emphasis on the low band (stereo-linked detector).
    for (int i = 0; i < n; ++i)
    {
        float level = 0.0f;
        for (int ch = 0; ch < numCh; ++ch)
            level = juce::jmax (level, std::abs (lowBuffer.getSample (ch, i)));

        fastEnv += (level > fastEnv ? fastAttack : fastRelease) * (level - fastEnv);
        slowEnv += (level > slowEnv ? slowAttack : slowRelease) * (level - slowEnv);

        const float punch = punchSmooth.getNextValue();
        const float transient = juce::jlimit (0.0f, 1.0f, (fastEnv - slowEnv) / (fastEnv + 1.0e-5f));
        const float gain = juce::Decibels::decibelsToGain (punch * 12.0f * transient);

        for (int ch = 0; ch < numCh; ++ch)
            lowBuffer.setSample (ch, i, lowBuffer.getSample (ch, i) * gain);
    }

    // 3) Drive / harmonics at 4x with RMS-tracking auto gain compensation.
    {
        auto lowBlock = juce::dsp::AudioBlock<float> (lowBuffer).getSubsetChannelBlock (0, (size_t) numCh).getSubBlock (0, (size_t) n);
        auto os = oversampler.processSamplesUp (lowBlock);
        const int osN = (int) os.getNumSamples();
        const int factor = (int) oversampler.getOversamplingFactor();

        float d = driveSmooth.getCurrentValue();
        float h = harmonicsSmooth.getCurrentValue();

        for (int j = 0; j < osN; ++j)
        {
            if (j % factor == 0)
            {
                d = driveSmooth.getNextValue();
                h = harmonicsSmooth.getNextValue();
            }

            const float k = 1.0f + 19.0f * d * d;          // pre-gain up to ~+26 dB
            const float bias = 0.3f * d;                    // asymmetry => even (octave) harmonics
            const float tb = std::tanh (bias);
            const float wet = h * juce::jmin (1.0f, d * 4.0f);
            const float comp = std::sqrt ((inPower + 1.0e-9f) / (outPower + 1.0e-9f));
            const float gain = 1.0f + wet * (juce::jlimit (0.25f, 4.0f, comp) - 1.0f);

            float inSum = 0.0f, outSum = 0.0f;
            for (int ch = 0; ch < numCh; ++ch)
            {
                const float x = os.getSample (ch, j);
                const float shaped = std::tanh (k * x + bias) - tb;
                const float y = x + wet * (shaped - x);
                inSum += x * x;
                outSum += y * y;
                os.setSample (ch, j, y * gain);
            }

            inPower += powerCoeff * (inSum - inPower);
            outPower += powerCoeff * (outSum - outPower);
        }

        oversampler.processSamplesDown (lowBlock);
    }

    // 4) Recombine, sub shelf, mono-below, mix, output.
    const int monoIndex = juce::roundToInt (pMonoBelow->load());
    const bool monoActive = monoIndex > 0 && numCh == 2;
    if (monoActive)
    {
        const float f = monoBelowFrequency (monoIndex);
        if (! monoWasActive)
            monoFilter.reset();
        if (f != currentMonoFreq)
        {
            currentMonoFreq = f;
            monoFilter.setCutoffFrequency (f);
        }
    }
    monoWasActive = monoActive;

    for (int i = 0; i < n; ++i)
    {
        updateSubShelf (subSmooth.getNextValue());
        const float mix = mixSmooth.getNextValue();
        const float outGain = outputSmooth.getNextValue();

        float wet[2] {};
        for (int ch = 0; ch < numCh; ++ch)
        {
            const float low = dcBlocker.process (ch, lowBuffer.getSample (ch, i));
            wet[ch] = subShelf.process (ch, low + highBuffer.getSample (ch, i));
        }

        if (monoActive)
        {
            float lowL = 0.0f, highL = 0.0f, lowR = 0.0f, highR = 0.0f;
            monoFilter.processSample (0, wet[0], lowL, highL);
            monoFilter.processSample (1, wet[1], lowR, highR);
            const float mono = 0.5f * (lowL + lowR);
            wet[0] = mono + highL;
            wet[1] = mono + highR;
        }

        for (int ch = 0; ch < numCh; ++ch)
        {
            const float dry = dryBuffer.getSample (ch, i);
            block.setSample (ch, i, (dry + mix * (wet[ch] - dry)) * outGain);
        }
    }
}

//==============================================================================
void WompLowEndProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    const auto state = apvts.copyState();
    if (auto xml = state.createXml())
        copyXmlToBinary (*xml, destData);
}

void WompLowEndProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
        if (xml->hasTagName (apvts.state.getType()))
            apvts.replaceState (juce::ValueTree::fromXml (*xml));
}

juce::AudioProcessorEditor* WompLowEndProcessor::createEditor()
{
    return new WompLowEndEditor (*this);
}

#if ! WOMP_TEST_BUILD
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new WompLowEndProcessor();
}
#endif
