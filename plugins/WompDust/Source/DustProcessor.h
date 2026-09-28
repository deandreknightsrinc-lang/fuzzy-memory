#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

#include "WompDSP.h"

namespace DustIDs
{
inline constexpr int version = 1;
inline constexpr const char* tapeDrive = "tapeDrive";
inline constexpr const char* wow       = "wow";
inline constexpr const char* flutter   = "flutter";
inline constexpr const char* crackle   = "crackle";
inline constexpr const char* hiss      = "hiss";
inline constexpr const char* lowCut    = "lowCut";
inline constexpr const char* highCut   = "highCut";
inline constexpr const char* age       = "age";
inline constexpr const char* mix       = "mix";
inline constexpr const char* output    = "output";
} // namespace DustIDs

/** Vinyl crackle generator: sparse clicks, rarer low pops and faint surface noise.
    One instance per channel with different seeds => stereo-decorrelated. */
struct CrackleGenerator
{
    void prepare (double sampleRate, uint32_t seed);
    float process (float amount) noexcept;

    womp::FastRandom rng;
    double sr = 44100.0;
    float clickEnv = 0.0f, clickDecay = 0.0f;
    float popEnv = 0.0f, popDecay = 0.0f, popLp = 0.0f, popLpCoeff = 0.0f;
    float clickHpState = 0.0f, surfaceHpState = 0.0f, hpCoeff = 0.0f;
};

/** W.O.M.P. Dust — "make it sound like a 1976 record".

    in ─┬──────────────────────────────────────────────────────────── dry (latency-aligned) ─┐
        └ wow/flutter modulated delay ─ tape saturation ─ + hiss + crackle ─ low cut ─ high cut ─ Mix ─ Output
*/
class WompDustProcessor final : public juce::AudioProcessor
{
public:
    WompDustProcessor();
    ~WompDustProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "WOMP Dust"; }
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

    /** Centre delay of the wow/flutter line; this is the plugin's (constant) latency. */
    static int centreDelaySamples (double sampleRate);

    // Maximum modulation depths (seconds of delay swing).
    static constexpr double kWowDepthSeconds = 0.0025;     // ~0.8 % pitch at 0.5 Hz
    static constexpr double kFlutterDepthSeconds = 0.0001; // ~0.4 % pitch at 6.5 Hz

    juce::AudioProcessorValueTreeState apvts;

private:
    std::atomic<float>* pTapeDrive = nullptr;
    std::atomic<float>* pWow = nullptr;
    std::atomic<float>* pFlutter = nullptr;
    std::atomic<float>* pCrackle = nullptr;
    std::atomic<float>* pHiss = nullptr;
    std::atomic<float>* pLowCut = nullptr;
    std::atomic<float>* pHighCut = nullptr;
    std::atomic<float>* pAge = nullptr;
    std::atomic<float>* pMix = nullptr;
    std::atomic<float>* pOutput = nullptr;

    double sampleRate = 44100.0;
    int centreDelay = 0;

    juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::Lagrange3rd> tapeDelay;
    juce::dsp::StateVariableTPTFilter<float> lowCutFilter, highCutFilter;
    womp::IntegerDelay dryDelay;

    std::array<CrackleGenerator, 2> crackles;
    std::array<womp::FastRandom, 2> hissRng { womp::FastRandom (0x1234567u), womp::FastRandom (0x7654321u) };
    std::array<float, 2> hissLp {};
    float hissLpCoeff = 0.0f;

    double wowPhase = 0.0, flutterPhase = 0.0;
    womp::RandomDrift wowDrift, flutterDrift;

    juce::SmoothedValue<float> driveSmooth, wowSmooth, flutterSmooth, crackleSmooth, hissSmooth, ageSmooth, mixSmooth;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Multiplicative> lowCutSmooth, highCutSmooth, outputSmooth;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WompDustProcessor)
};
