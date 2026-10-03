#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_formats/juce_audio_formats.h>

#include "Engine/AudioLoader.h"
#include "Engine/AutoChop.h"
#include "Engine/PadSampler.h"

class KbkStudioProcessor : public juce::AudioProcessor,
                           public juce::ChangeBroadcaster,
                           private juce::AudioProcessorValueTreeState::Listener
{
public:
    KbkStudioProcessor();
    ~KbkStudioProcessor() override;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.5; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    // ---- used by the interface (message thread) ----
    enum class ChopHow { Smart, Hits, Equal4, Equal8, Equal16 };

    void loadFile (const juce::File& file, int pad);
    void loadUrl (const juce::String& url, int pad);
    // Spreads audio across the pads. Returns false for a one-shot (nothing changed).
    bool chopToPads (const juce::AudioBuffer<float>& audio, double rate, const juce::String& name, ChopHow how);
    void chopPad (int pad, ChopHow how);
    void undoChop();
    bool canUndo() const { return ! undoKit.empty(); }
    void clearPad (int pad);
    void updatePad (int pad, const std::function<void (kbk::Pad&)>& change);
    bool exportPad (int pad, const juce::File& file);
    void checkHelper();

    // Neural Tone: load a NAM amp model (.nam / .json)
    void loadAmp (const juce::File& file);
    void clearAmp();
    juce::String ampName;

    // AI Vox: voice models live on the KBK helper
    void refreshVoices();
    void aiVox (int pad);
    juce::StringArray voices;
    juce::String voicesFolder, voxVoice;
    int voxPitch = 0;
    bool voxReady = false, voxBusy = false;

    bool autoChop = true, chopCut = true;
    juce::String statusText { "Drop a song, loop or sample on the pads, or paste a link." };
    bool statusError = false, busy = false;
    std::atomic<int> helperState { -1 }; // -1 unknown, 0 off, 1 on

    kbk::PadSampler sampler;
    juce::AudioProcessorValueTreeState params;

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout();

private:
    void parameterChanged (const juce::String& id, float value) override;
    void place (kbk::LoadedAudio loaded, int pad);
    void setStatus (const juce::String& text, bool error = false);
    void pushMasterSettings();

    kbk::AudioLoader loader;
    // set false when the plug-in closes, so late background results are dropped
    std::shared_ptr<std::atomic<bool>> alive = std::make_shared<std::atomic<bool>> (true);
    void onMessageThread (std::function<void()> fn);
    juce::ThreadPool pool { 1 };
    std::vector<kbk::Pad> undoKit;
    void snapshotForUndo();
    void applyAmp (const std::string& json, const juce::String& name, bool announce);
    std::string ampJson; // kept so the project reopens with the same amp
    std::atomic<bool> masterDirty { true };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KbkStudioProcessor)
};
