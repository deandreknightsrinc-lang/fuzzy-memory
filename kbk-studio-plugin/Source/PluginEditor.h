#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include "PluginProcessor.h"

namespace kbkui
{
namespace colours
{
const juce::Colour bg { 0xff0b0c10 }, panel { 0xff15171e }, panel2 { 0xff1d2029 }, line { 0xff2c303b },
    text { 0xffecedf2 }, muted { 0xff8d93a3 }, gold { 0xffe8b931 }, purple { 0xff8b5cf6 }, red { 0xffef4444 },
    green { 0xff22c55e };
}

class LookAndFeel : public juce::LookAndFeel_V4
{
public:
    LookAndFeel();
    void drawRotarySlider (juce::Graphics&, int x, int y, int w, int h, float pos, float start, float end, juce::Slider&) override;
    void drawButtonBackground (juce::Graphics&, juce::Button&, const juce::Colour&, bool over, bool down) override;
    void drawToggleButton (juce::Graphics&, juce::ToggleButton&, bool over, bool down) override;
    juce::Font getTextButtonFont (juce::TextButton&, int h) override;
};

class PadView : public juce::Component
{
public:
    PadView (KbkStudioProcessor& p, int index);
    void paint (juce::Graphics&) override;
    void mouseDown (const juce::MouseEvent&) override;
    void mouseUp (const juce::MouseEvent&) override;
    void flash() { flashLevel = 1.0f; repaint(); }
    void decay();
    std::function<void (int)> onSelect;
    bool selected = false, dragOver = false, learning = false;
    juce::String noteName;

private:
    KbkStudioProcessor& proc;
    int index;
    float flashLevel = 0.0f;
};

class WaveView : public juce::Component
{
public:
    explicit WaveView (KbkStudioProcessor& p) : proc (p) {}
    void setPad (int i) { pad = i; repaint(); }
    void paint (juce::Graphics&) override;
    void mouseDown (const juce::MouseEvent&) override;
    void mouseDrag (const juce::MouseEvent&) override;
    std::function<void()> onChange;

private:
    KbkStudioProcessor& proc;
    int pad = 0;
    bool draggingStart = true;
};

juce::Colour padColour (int index);
} // namespace kbkui

class KbkStudioEditor : public juce::AudioProcessorEditor,
                        public juce::FileDragAndDropTarget,
                        public juce::TextDragAndDropTarget,
                        private juce::ChangeListener,
                        private juce::Timer
{
public:
    explicit KbkStudioEditor (KbkStudioProcessor&);
    ~KbkStudioEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

    bool isInterestedInFileDrag (const juce::StringArray&) override { return true; }
    void fileDragMove (const juce::StringArray&, int x, int y) override { highlightDrop (x, y); }
    void fileDragExit (const juce::StringArray&) override { highlightDrop (-1, -1); }
    void filesDropped (const juce::StringArray& files, int x, int y) override;
    bool isInterestedInTextDrag (const juce::String&) override { return true; }
    void textDragMove (const juce::String&, int x, int y) override { highlightDrop (x, y); }
    void textDragExit (const juce::String&) override { highlightDrop (-1, -1); }
    void textDropped (const juce::String& text, int x, int y) override;

private:
    void changeListenerCallback (juce::ChangeBroadcaster*) override;
    void timerCallback() override;
    void selectPad (int i);
    void refreshEditor();
    int padAt (int x, int y) const;
    void highlightDrop (int x, int y);
    KbkStudioProcessor::ChopHow chopHow() const;

    using SliderAttachment = juce::AudioProcessorValueTreeState::SliderAttachment;
    using ButtonAttachment = juce::AudioProcessorValueTreeState::ButtonAttachment;
    using ComboAttachment = juce::AudioProcessorValueTreeState::ComboBoxAttachment;

    struct Knob
    {
        juce::Slider slider { juce::Slider::RotaryHorizontalVerticalDrag, juce::Slider::TextBoxBelow };
        juce::Label label;
        std::unique_ptr<SliderAttachment> attachment;
    };
    void setupKnob (Knob& k, const juce::String& name, const juce::String& paramId = {});

    KbkStudioProcessor& proc;
    kbkui::LookAndFeel lnf;
    std::unique_ptr<juce::FileChooser> chooser;

    // pads
    std::array<std::unique_ptr<kbkui::PadView>, kbk::numPads> pads;
    std::array<uint32_t, kbk::numPads> seenHits {};
    juce::Rectangle<int> padArea;
    int dropPad = -1;
    juce::ToggleButton autoChopToggle { "Auto-chop songs & loops" }, chopCutToggle { "Chops cut each other off" };
    juce::TextButton undoButton { "Undo" }, stopButton { "Stop all" }, learnBaseButton { "Learn from key" };
    juce::ComboBox keyModeBox, baseNoteBox;
    juce::ToggleButton velocityToggle { "Velocity" };
    juce::Label keyModeLabel, baseNoteLabel, midiLabel;
    std::unique_ptr<ComboAttachment> keyModeAttachment;
    std::unique_ptr<ButtonAttachment> velocityAttachment;

    // pad editor
    juce::Label padTitle;
    juce::TextButton playButton { "Play" };
    kbkui::WaveView wave { proc };
    juce::TextButton openButton { "Open file..." }, urlButton { "Load link" }, chopButton { "Chop across pads" },
        clearButton { "Clear pad" }, exportButton { "Export WAV..." }, learnButton { "Learn note" };
    juce::TextEditor urlBox;
    juce::ComboBox chopBox, modeBox, chokeBox;
    juce::ToggleButton reverseToggle { "Reverse" };
    Knob level, tune, pan;
    juce::Label noteLabel, modeLabel, chokeLabel;

    // AI Vox (pad editor)
    juce::Label voxHeading, voxPitchLabel;
    juce::ComboBox voiceBox;
    juce::TextButton voxRescan { "Rescan" }, voxFolder { "Folder" }, voxButton { "AI Vox" };
    juce::Slider voxPitch { juce::Slider::LinearHorizontal, juce::Slider::TextBoxRight };

    // master
    juce::ToggleButton ntOn { "NEURAL TONE" }, glueOn { "GLUE COMP" }, tapeOn { "TAPE" }, limOn { "LIMITER" };
    std::unique_ptr<ButtonAttachment> ntOnA, glueOnA, tapeOnA, limOnA;
    juce::TextButton ampButton { "Load Amp..." };
    juce::Label ampLabel;
    Knob ntIn, ntDrive, ntMix, ntOut;
    Knob glueThresh, glueRatio, glueAttack, glueRelease, glueMakeup, glueMix, tapeDrive, tapeWarmth, limCeiling, limRelease, master;

    juce::Label status, helperLabel;
    float meter = 0.0f;
    int learnTarget = -1, lastSel = -1;
    bool refreshing = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KbkStudioEditor)
};
