#pragma once

#include "DustProcessor.h"
#include "WompLookAndFeel.h"

class WompDustEditor final : public juce::AudioProcessorEditor
{
public:
    explicit WompDustEditor (WompDustProcessor&);
    ~WompDustEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

    static constexpr int kWidth = 820;
    static constexpr int kHeight = 470;

private:
    womp::LookAndFeel lookAndFeel;

    womp::Knob tapeDrive, wow, flutter, crackle, hiss, lowCut, highCut, age, mix, output;

    juce::Rectangle<int> tapeSection, surfaceSection, bandSection, masterSection;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WompDustEditor)
};
