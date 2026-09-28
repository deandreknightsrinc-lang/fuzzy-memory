#include "DustEditor.h"

WompDustEditor::WompDustEditor (WompDustProcessor& p)
    : AudioProcessorEditor (&p),
      tapeDrive (p.apvts, DustIDs::tapeDrive, "Tape Drive"),
      wow (p.apvts, DustIDs::wow, "Wow"),
      flutter (p.apvts, DustIDs::flutter, "Flutter"),
      crackle (p.apvts, DustIDs::crackle, "Crackle"),
      hiss (p.apvts, DustIDs::hiss, "Hiss"),
      lowCut (p.apvts, DustIDs::lowCut, "Low Cut"),
      highCut (p.apvts, DustIDs::highCut, "High Cut"),
      age (p.apvts, DustIDs::age, "Age"),
      mix (p.apvts, DustIDs::mix, "Mix"),
      output (p.apvts, DustIDs::output, "Output")
{
    setLookAndFeel (&lookAndFeel);

    for (auto* c : std::initializer_list<juce::Component*> { &tapeDrive, &wow, &flutter, &crackle, &hiss,
                                                              &lowCut, &highCut, &age, &mix, &output })
        addAndMakeVisible (c);

    // Age is the macro: make it stand out.
    age.label.setColour (juce::Label::textColourId, womp::Palette::gold);

    setResizable (false, false);
    setSize (kWidth, kHeight);
}

WompDustEditor::~WompDustEditor()
{
    setLookAndFeel (nullptr);
}

void WompDustEditor::paint (juce::Graphics& g)
{
    using namespace womp::Palette;
    g.fillAll (background);

    womp::drawHeader (g, getLocalBounds(), "W.O.M.P. DUST");

    // Emblem: a 1976 record — grooves, gold label, spindle hole.
    {
        const auto c = juce::Point<float> ((float) getWidth() - 60.0f, 40.0f);
        const float r = 30.0f;
        g.setColour (juce::Colour (0xff050506));
        g.fillEllipse (juce::Rectangle<float> (r * 2.0f, r * 2.0f).withCentre (c));
        for (float gr = r - 2.0f; gr > r * 0.42f; gr -= 2.2f)
        {
            g.setColour (panelEdge.withAlpha (0.9f));
            g.drawEllipse (juce::Rectangle<float> (gr * 2.0f, gr * 2.0f).withCentre (c), 0.6f);
        }
        juce::Path sheen;
        sheen.addCentredArc (c.x, c.y, r * 0.8f, r * 0.8f, 0.0f, -0.9f, -0.3f, true);
        g.setColour (text.withAlpha (0.25f));
        g.strokePath (sheen, juce::PathStrokeType (1.2f));
        g.setColour (gold);
        g.fillEllipse (juce::Rectangle<float> (r * 0.8f, r * 0.8f).withCentre (c));
        g.setColour (background);
        g.fillEllipse (juce::Rectangle<float> (3.5f, 3.5f).withCentre (c));
        g.setColour (gold.withAlpha (0.8f));
        g.setFont (womp::makeFont (11.0f, true));
        g.drawText ("'76", juce::Rectangle<float> (40.0f, 16.0f).withCentre (c.translated (-58.0f, 0.0f)),
                    juce::Justification::centredRight, false);
    }

    womp::drawSection (g, tapeSection, "Tape & Transport");
    womp::drawSection (g, surfaceSection, "Surface");
    womp::drawSection (g, bandSection, "Bandwidth");
    womp::drawSection (g, masterSection, "Master");

    g.setColour (textDim);
    g.setFont (womp::makeFont (11.0f));
    const auto footer = getLocalBounds().removeFromBottom (24).reduced (24, 0);
    g.drawText ("MAKE IT SOUND LIKE A 1976 RECORD", footer, juce::Justification::centredLeft, false);
    g.drawText ("v1.0.0", footer, juce::Justification::centredRight, false);
}

void WompDustEditor::resized()
{
    auto area = getLocalBounds().withTrimmedTop (92).withTrimmedBottom (28).reduced (20, 0);

    auto top = area.removeFromTop (area.getHeight() / 2).withTrimmedBottom (6);
    auto bottom = area.withTrimmedTop (6);

    tapeSection = top.removeFromLeft (top.getWidth() * 3 / 5).withTrimmedRight (6);
    surfaceSection = top.withTrimmedLeft (6);
    bandSection = bottom.removeFromLeft (bottom.getWidth() * 2 / 5).withTrimmedRight (6);
    masterSection = bottom.withTrimmedLeft (6);

    auto place = [] (juce::Rectangle<int> section, std::initializer_list<juce::Component*> items) {
        auto inner = section.reduced (10).withTrimmedTop (12);
        const int w = inner.getWidth() / (int) items.size();
        for (auto* c : items)
            c->setBounds (inner.removeFromLeft (w).reduced (4, 0));
    };

    place (tapeSection, { &tapeDrive, &wow, &flutter });
    place (surfaceSection, { &crackle, &hiss });
    place (bandSection, { &lowCut, &highCut });
    place (masterSection, { &age, &mix, &output });
}
