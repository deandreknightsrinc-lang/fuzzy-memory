#pragma once

#include "LowEndProcessor.h"
#include "WompLookAndFeel.h"

class WompLowEndEditor final : public juce::AudioProcessorEditor
{
public:
    explicit WompLowEndEditor (WompLowEndProcessor&);
    ~WompLowEndEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

    static constexpr int kWidth = 780;
    static constexpr int kHeight = 460;

private:
    womp::LookAndFeel lookAndFeel;

    womp::Knob drive, harmonics, punch, subBoost, tight, output, mix;
    womp::Chooser monoBelow;

    juce::Rectangle<int> satSection, shapeSection, outSection;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WompLowEndEditor)
};
