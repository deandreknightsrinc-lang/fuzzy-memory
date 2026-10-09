#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_dsp/juce_dsp.h>

#include "Engine/AudioListener.h"
#include "Engine/SoundEngine.h"

class KnightLyfeProcessor final : public juce::AudioProcessor
{
public:
    KnightLyfeProcessor();

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using juce::AudioProcessor::processBlock;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 3.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    /** Handles a batch of messages the interface sent with emitEvent("kk", { batch }). */
    void handleInterfaceBatch (const juce::var& batch);

    knightlyfe::SoundEngine& getEngine() { return engine; }
    knightlyfe::AudioListener& getListener() { return listener; }
    /** Lessons listen to the input (mic or audio interface); the standalone app
        un-mutes its input for that, since nothing is ever played back from it. */
    void setListening (bool on, bool bassRange);
    juce::AudioProcessorValueTreeState parameters;

private:
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameters();
    static BusesProperties makeBuses();

    knightlyfe::SoundEngine engine;
    knightlyfe::AudioListener listener;
    juce::dsp::Reverb reverb;
    juce::dsp::Limiter<float> limiter; // keeps big chords and drums from clipping in Logic
    juce::AudioBuffer<float> monoScratch; // stereo render target for mono tracks
    juce::SmoothedValue<float> masterGain;
    std::atomic<float>* masterParam = nullptr;
    std::atomic<float>* reverbParam = nullptr;
    std::atomic<float>* drumTrackParam = nullptr;

    // Standalone app: listen to every MIDI keyboard and e-kit, including ones plugged in later.
    void openAllMidiInputs();
    juce::MidiDeviceListConnection midiDevicesChanged;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KnightLyfeProcessor)
};
