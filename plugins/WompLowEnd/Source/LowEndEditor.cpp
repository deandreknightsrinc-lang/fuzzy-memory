#include "LowEndEditor.h"

WompLowEndEditor::WompLowEndEditor (WompLowEndProcessor& p)
    : AudioProcessorEditor (&p),
      drive (p.apvts, LowEndIDs::drive, "Drive"),
      harmonics (p.apvts, LowEndIDs::harmonics, "Harmonics"),
      punch (p.apvts, LowEndIDs::punch, "Punch"),
      subBoost (p.apvts, LowEndIDs::subBoost, "Sub Boost"),
      tight (p.apvts, LowEndIDs::tight, "Tight"),
      output (p.apvts, LowEndIDs::output, "Output"),
      mix (p.apvts, LowEndIDs::mix, "Mix"),
      monoBelow (p.apvts, LowEndIDs::monoBelow, "Mono Below")
{
    setLookAndFeel (&lookAndFeel);

    for (auto* c : std::initializer_list<juce::Component*> { &drive, &harmonics, &punch, &subBoost, &tight, &output, &mix, &monoBelow })
        addAndMakeVisible (c);

    // Fixed size: the layout is designed for exactly this size (host-resize safe).
    setResizable (false, false);
    setSize (kWidth, kHeight);
}

WompLowEndEditor::~WompLowEndEditor()
{
    setLookAndFeel (nullptr);
}

void WompLowEndEditor::paint (juce::Graphics& g)
{
    using namespace womp::Palette;
    g.fillAll (background);

    womp::drawHeader (g, getLocalBounds(), "W.O.M.P. LOW END");

    // Emblem: a decaying 808 waveform with a harmonic overtone, top right.
    {
        auto r = juce::Rectangle<float> ((float) getWidth() - 214.0f, 18.0f, 190.0f, 46.0f);
        juce::Path wave;
        const int steps = 180;
        for (int i = 0; i <= steps; ++i)
        {
            const float t = (float) i / (float) steps;
            const float env = std::exp (-3.2f * t);
            const float phase = juce::MathConstants<float>::twoPi * (2.5f * t + 1.2f * t * t);
            const float v = env * (std::sin (phase) + 0.25f * std::sin (2.0f * phase));
            const float px = r.getX() + t * r.getWidth();
            const float py = r.getCentreY() - v * r.getHeight() * 0.42f;
            if (i == 0)
                wave.startNewSubPath (px, py);
            else
                wave.lineTo (px, py);
        }
        g.setColour (gold.withAlpha (0.85f));
        g.strokePath (wave, juce::PathStrokeType (2.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
        g.setColour (gold.withAlpha (0.2f));
        g.drawHorizontalLine ((int) r.getCentreY(), r.getX(), r.getRight());
    }

    womp::drawSection (g, satSection, "Saturation");
    womp::drawSection (g, shapeSection, "Low-End Shape");
    womp::drawSection (g, outSection, "Output");

    g.setColour (textDim);
    g.setFont (womp::makeFont (11.0f));
    const auto footer = getLocalBounds().removeFromBottom (24).reduced (24, 0);
    g.drawText ("808 & BASS WEAPON  /  4X OVERSAMPLED DRIVE", footer, juce::Justification::centredLeft, false);
    g.drawText ("v1.0.0", footer, juce::Justification::centredRight, false);
}

void WompLowEndEditor::resized()
{
    auto area = getLocalBounds().withTrimmedTop (92).withTrimmedBottom (28).reduced (20, 0);

    auto top = area.removeFromTop (area.getHeight() / 2).withTrimmedBottom (6);
    auto bottom = area.withTrimmedTop (6);

    satSection = top.removeFromLeft (top.getWidth() * 3 / 5).withTrimmedRight (6);
    outSection = top.withTrimmedLeft (6);
    shapeSection = bottom;

    auto place = [] (juce::Rectangle<int> section, std::initializer_list<juce::Component*> items) {
        auto inner = section.reduced (10).withTrimmedTop (12);
        const int w = inner.getWidth() / (int) items.size();
        for (auto* c : items)
            c->setBounds (inner.removeFromLeft (w).reduced (4, 0));
    };

    place (satSection, { &drive, &harmonics, &punch });
    place (outSection, { &mix, &output });
    place (shapeSection, { &subBoost, &tight, &monoBelow });
}
