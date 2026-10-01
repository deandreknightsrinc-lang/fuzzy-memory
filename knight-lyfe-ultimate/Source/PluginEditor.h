#pragma once

#include <juce_gui_extra/juce_gui_extra.h>

#include "PluginProcessor.h"
#include "WebAssets.h"

/** The Knight Keys interface in a native web view, wired to the C++ engine. */
class KnightLyfeEditor final : public juce::AudioProcessorEditor,
                               private juce::Timer
{
public:
    explicit KnightLyfeEditor (KnightLyfeProcessor&);
    ~KnightLyfeEditor() override;

    void resized() override;
    void paint (juce::Graphics&) override;

private:
    void timerCallback() override;
    void sendTransport();
    void saveFile (const juce::var& request);
    juce::WebBrowserComponent::Options makeOptions();

    KnightLyfeProcessor& processor;
    WebAssets assets;
    juce::WebBrowserComponent browser;
    std::unique_ptr<juce::FileChooser> chooser;
    std::vector<knightlyfe::SoundEngine::HostMessage> hostMessages;
    knightlyfe::SoundEngine::HostPosition lastTransport;
    int idleTransportTicks = 0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KnightLyfeEditor)
};
