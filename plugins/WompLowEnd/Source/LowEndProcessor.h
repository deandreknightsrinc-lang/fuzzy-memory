#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

#include "WompDSP.h"

namespace LowEndIDs
{
inline constexpr int version = 1;
inline constexpr const char* drive     = "drive";
inline constexpr const char* harmonics = "harmonics";
inline constexpr const char* subBoost  = "subBoost";
inline constexpr const char* monoBelow = "monoBelow";
inline constexpr const char* punch     = "punch";
inline constexpr const char* tight     = "tight";
inline constexpr const char* output    = "output";
inline constexpr const char* mix       = "mix";
} // namespace LowEndIDs

/** W.O.M.P. Low End — 808 & bass weapon.

    Signal flow (per channel, stereo-linked detectors):
      in ─┬─────────────────────────────────────────────── dry (latency-aligned) ─┐
          └ Tight HPF ─ LR4 split @150 Hz ┬ low ─ Punch ─ [4x OS: drive/harmonics] ─ DC ┐   │
                                          └ high ─ delay(latency) ───────────────────── + ─ Sub shelf ─ Mono Below ─ Mix ─ Output
*/
class WompLowEndProcessor final : public juce::AudioProcessor
{
public:
    WompLowEndProcessor();
    ~WompLowEndProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "WOMP Low End"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();
    static const juce::StringArray& monoBelowChoices();
    static float monoBelowFrequency (int choiceIndex); // 0 => off

    static constexpr float kSplitFrequency = 150.0f;
    static constexpr size_t kOversamplingOrder = 2; // 2^2 = 4x

    juce::AudioProcessorValueTreeState apvts;

private:
    void processChunk (juce::dsp::AudioBlock<float> block);
    void updateSubShelf (float gainDb);

    std::atomic<float>* pDrive = nullptr;
    std::atomic<float>* pHarmonics = nullptr;
    std::atomic<float>* pSubBoost = nullptr;
    std::atomic<float>* pMonoBelow = nullptr;
    std::atomic<float>* pPunch = nullptr;
    std::atomic<float>* pTight = nullptr;
    std::atomic<float>* pOutput = nullptr;
    std::atomic<float>* pMix = nullptr;

    double sampleRate = 44100.0;
    int maxBlockSize = 512;
    int latency = 0;

    juce::dsp::Oversampling<float> oversampler;
    juce::dsp::StateVariableTPTFilter<float> tightFilter;
    juce::dsp::LinkwitzRileyFilter<float> splitFilter, monoFilter;
    womp::Biquad subShelf;
    womp::DCBlocker dcBlocker;
    womp::IntegerDelay dryDelay, highDelay;

    juce::AudioBuffer<float> dryBuffer, lowBuffer, highBuffer;

    juce::SmoothedValue<float> driveSmooth, harmonicsSmooth, punchSmooth, subSmooth, tightSmooth, mixSmooth;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Multiplicative> outputSmooth;

    // Punch detector (stereo-linked).
    float fastEnv = 0.0f, slowEnv = 0.0f;
    float fastAttack = 0.0f, fastRelease = 0.0f, slowAttack = 0.0f, slowRelease = 0.0f;

    // Auto gain compensation for the drive stage (runs at the oversampled rate).
    float inPower = 0.0f, outPower = 0.0f, powerCoeff = 0.0f;

    float currentSubGainDb = -1000.0f;
    bool monoWasActive = false;
    float currentMonoFreq = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WompLowEndProcessor)
};
