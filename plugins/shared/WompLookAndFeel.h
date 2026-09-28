#pragma once

// Shared W.O.M.P. look: #0E0E10 background, #C9A227 gold, #E8E2D0 text.
// Everything is drawn with juce::Graphics — no image assets.

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

namespace womp
{
namespace Palette
{
    inline const juce::Colour background { 0xff0e0e10 };
    inline const juce::Colour panel      { 0xff17171b };
    inline const juce::Colour panelEdge  { 0xff26262b };
    inline const juce::Colour gold       { 0xffc9a227 };
    inline const juce::Colour goldDim    { 0xff6e5a1a };
    inline const juce::Colour text       { 0xffe8e2d0 };
    inline const juce::Colour textDim    { 0xff8d887c };
    inline const juce::Colour track      { 0xff2b2b30 };
} // namespace Palette

inline juce::Font makeFont (float height, bool bold = false)
{
    auto options = juce::FontOptions (height);
    if (bold)
        options = options.withStyle ("Bold");
    return juce::Font (options);
}

//==============================================================================
class LookAndFeel final : public juce::LookAndFeel_V4
{
public:
    LookAndFeel()
    {
        using namespace Palette;
        setColour (juce::ResizableWindow::backgroundColourId, background);
        setColour (juce::Slider::textBoxTextColourId, text);
        setColour (juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
        setColour (juce::Slider::textBoxBackgroundColourId, juce::Colours::transparentBlack);
        setColour (juce::Slider::textBoxHighlightColourId, goldDim);
        setColour (juce::Slider::rotarySliderFillColourId, gold);
        setColour (juce::Slider::rotarySliderOutlineColourId, track);
        setColour (juce::Label::textColourId, text);
        setColour (juce::Label::textWhenEditingColourId, text);
        setColour (juce::Label::backgroundWhenEditingColourId, panel);
        setColour (juce::Label::outlineWhenEditingColourId, gold);
        setColour (juce::TextEditor::backgroundColourId, panel);
        setColour (juce::TextEditor::textColourId, text);
        setColour (juce::TextEditor::highlightColourId, goldDim);
        setColour (juce::TextEditor::focusedOutlineColourId, gold);
        setColour (juce::CaretComponent::caretColourId, gold);
        setColour (juce::ComboBox::backgroundColourId, panel);
        setColour (juce::ComboBox::textColourId, text);
        setColour (juce::ComboBox::outlineColourId, panelEdge);
        setColour (juce::ComboBox::arrowColourId, gold);
        setColour (juce::ComboBox::focusedOutlineColourId, gold);
        setColour (juce::PopupMenu::backgroundColourId, panel);
        setColour (juce::PopupMenu::textColourId, text);
        setColour (juce::PopupMenu::highlightedBackgroundColourId, goldDim);
        setColour (juce::PopupMenu::highlightedTextColourId, text);
    }

    void drawRotarySlider (juce::Graphics& g, int x, int y, int width, int height, float sliderPos,
                           float startAngle, float endAngle, juce::Slider& slider) override
    {
        using namespace Palette;
        const auto bounds = juce::Rectangle<int> (x, y, width, height).toFloat().reduced (6.0f);
        const float radius = juce::jmin (bounds.getWidth(), bounds.getHeight()) * 0.5f;
        const auto centre = bounds.getCentre();
        const float arcRadius = radius - 3.0f;
        const float angle = startAngle + sliderPos * (endAngle - startAngle);
        const bool hot = slider.isMouseOverOrDragging() && slider.isEnabled();

        // Track arc.
        juce::Path track;
        track.addCentredArc (centre.x, centre.y, arcRadius, arcRadius, 0.0f, startAngle, endAngle, true);
        g.setColour (Palette::track);
        g.strokePath (track, juce::PathStrokeType (4.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));

        // Value arc (bipolar sliders fill from the centre).
        const bool bipolar = slider.getMinimum() < 0.0 && slider.getMaximum() > 0.0;
        const float fromAngle = bipolar ? startAngle + (float) slider.valueToProportionOfLength (0.0) * (endAngle - startAngle)
                                        : startAngle;
        juce::Path value;
        value.addCentredArc (centre.x, centre.y, arcRadius, arcRadius, 0.0f,
                             juce::jmin (fromAngle, angle), juce::jmax (fromAngle, angle), true);
        g.setColour (hot ? gold.brighter (0.25f) : gold);
        g.strokePath (value, juce::PathStrokeType (4.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));

        // Knob body.
        const float bodyRadius = arcRadius - 8.0f;
        const auto body = juce::Rectangle<float> (bodyRadius * 2.0f, bodyRadius * 2.0f).withCentre (centre);
        g.setGradientFill (juce::ColourGradient (juce::Colour (0xff2a2a30), body.getX(), body.getY(),
                                                 juce::Colour (0xff111114), body.getRight(), body.getBottom(), false));
        g.fillEllipse (body);
        g.setColour (panelEdge.brighter (0.2f));
        g.drawEllipse (body, 1.0f);

        // Pointer.
        juce::Path pointer;
        const float pw = 3.0f;
        pointer.addRoundedRectangle (-pw * 0.5f, -bodyRadius + 4.0f, pw, bodyRadius * 0.45f, 1.5f);
        g.setColour (text);
        g.fillPath (pointer, juce::AffineTransform::rotation (angle).translated (centre));
    }

    juce::Font getLabelFont (juce::Label& label) override
    {
        return makeFont (juce::jmin (15.0f, (float) label.getHeight() * 0.75f));
    }

    juce::Font getComboBoxFont (juce::ComboBox&) override { return makeFont (14.0f); }
    juce::Font getPopupMenuFont() override { return makeFont (14.0f); }

    juce::Label* createSliderTextBox (juce::Slider& slider) override
    {
        auto* l = LookAndFeel_V4::createSliderTextBox (slider);
        l->setColour (juce::Label::textColourId, Palette::textDim);
        l->setColour (juce::Label::outlineColourId, juce::Colours::transparentBlack);
        l->setFont (makeFont (13.0f));
        return l;
    }
};

//==============================================================================
/** Rotary knob with a caption, bound to an APVTS parameter. */
class Knob final : public juce::Component
{
public:
    Knob (juce::AudioProcessorValueTreeState& state, const juce::String& paramID, const juce::String& caption)
    {
        slider.setSliderStyle (juce::Slider::RotaryHorizontalVerticalDrag);
        slider.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 90, 18);
        slider.setRotaryParameters (juce::degreesToRadians (225.0f), juce::degreesToRadians (495.0f), true);
        addAndMakeVisible (slider);

        label.setText (caption.toUpperCase(), juce::dontSendNotification);
        label.setJustificationType (juce::Justification::centred);
        label.setFont (makeFont (13.0f, true));
        label.setColour (juce::Label::textColourId, Palette::text);
        addAndMakeVisible (label);

        attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment> (state, paramID, slider);
    }

    void resized() override
    {
        auto r = getLocalBounds();
        label.setBounds (r.removeFromTop (20));
        slider.setBounds (r);
    }

    juce::Slider slider;
    juce::Label label;

private:
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> attachment;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Knob)
};

//==============================================================================
/** Combo box with a caption, bound to an APVTS choice parameter. */
class Chooser final : public juce::Component
{
public:
    Chooser (juce::AudioProcessorValueTreeState& state, const juce::String& paramID, const juce::String& caption)
    {
        if (auto* choice = dynamic_cast<juce::AudioParameterChoice*> (state.getParameter (paramID)))
            box.addItemList (choice->choices, 1);
        box.setJustificationType (juce::Justification::centred);
        addAndMakeVisible (box);

        label.setText (caption.toUpperCase(), juce::dontSendNotification);
        label.setJustificationType (juce::Justification::centred);
        label.setFont (makeFont (13.0f, true));
        addAndMakeVisible (label);

        attachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment> (state, paramID, box);
    }

    void resized() override
    {
        auto r = getLocalBounds();
        label.setBounds (r.removeFromTop (20));
        box.setBounds (r.withSizeKeepingCentre (juce::jmin (r.getWidth() - 8, 110), 28));
    }

    juce::ComboBox box;
    juce::Label label;

private:
    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> attachment;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (Chooser)
};

//==============================================================================
/** Header: gold title with wide tracking, subtitle, hairline. Returns remaining area. */
inline juce::Rectangle<int> drawHeader (juce::Graphics& g, juce::Rectangle<int> area, const juce::String& title)
{
    using namespace Palette;
    auto header = area.removeFromTop (78);

    auto titleArea = header.reduced (24, 0).removeFromTop (50).withTrimmedTop (14);
    auto titleFont = juce::Font (juce::FontOptions (28.0f).withStyle ("Bold").withKerningFactor (0.12f));
    g.setFont (titleFont);
    g.setColour (gold);
    g.drawText (title, titleArea, juce::Justification::centredLeft, false);

    g.setFont (makeFont (13.0f));
    g.setColour (textDim);
    g.drawText (juce::String::fromUTF8 ("Knight Lyfe \xc2\xb7 Weapons of Mass Production"),
                header.reduced (24, 0).withTrimmedTop (50).removeFromTop (18), juce::Justification::centredLeft, false);

    g.setColour (gold.withAlpha (0.6f));
    g.fillRect (juce::Rectangle<float> ((float) area.getX() + 24.0f, (float) header.getBottom() - 1.0f,
                                        (float) area.getWidth() - 48.0f, 1.0f));
    return area;
}

/** Rounded panel behind a group of controls, with a small caption. */
inline void drawSection (juce::Graphics& g, juce::Rectangle<int> r, const juce::String& caption)
{
    using namespace Palette;
    g.setColour (panel);
    g.fillRoundedRectangle (r.toFloat(), 10.0f);
    g.setColour (panelEdge);
    g.drawRoundedRectangle (r.toFloat().reduced (0.5f), 10.0f, 1.0f);

    g.setColour (goldDim.brighter (0.3f));
    g.setFont (juce::Font (juce::FontOptions (11.0f).withStyle ("Bold").withKerningFactor (0.2f)));
    g.drawText (caption.toUpperCase(), r.reduced (14, 6).removeFromTop (14), juce::Justification::topLeft, false);
}

} // namespace womp
