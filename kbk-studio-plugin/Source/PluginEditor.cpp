#include "PluginEditor.h"

using namespace kbkui;

namespace
{
juce::String noteToName (int n)
{
    // middle C (60) = C3, the way Logic labels it
    return juce::MidiMessage::getMidiNoteName (n, true, true, 3);
}

// MPC layout: pad 1 bottom-left, pad 16 top-right
constexpr int gridOrder[16] = { 12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3 };
} // namespace

juce::Colour kbkui::padColour (int i)
{
    switch (i / 4)
    {
        case 0: return colours::gold;
        case 1: return colours::purple;
        case 2: return colours::red;
        default: return colours::green;
    }
}

// ---- look and feel ------------------------------------------------------------------

LookAndFeel::LookAndFeel()
{
    setColour (juce::ResizableWindow::backgroundColourId, colours::bg);
    setColour (juce::Label::textColourId, colours::text);
    setColour (juce::TextButton::buttonColourId, colours::panel2);
    setColour (juce::TextButton::textColourOffId, colours::text);
    setColour (juce::TextButton::textColourOnId, colours::bg);
    setColour (juce::ComboBox::backgroundColourId, colours::bg);
    setColour (juce::ComboBox::outlineColourId, colours::line);
    setColour (juce::ComboBox::textColourId, colours::text);
    setColour (juce::ComboBox::arrowColourId, colours::muted);
    setColour (juce::PopupMenu::backgroundColourId, colours::panel);
    setColour (juce::PopupMenu::highlightedBackgroundColourId, colours::purple);
    setColour (juce::TextEditor::backgroundColourId, colours::bg);
    setColour (juce::TextEditor::outlineColourId, colours::line);
    setColour (juce::TextEditor::focusedOutlineColourId, colours::gold);
    setColour (juce::TextEditor::textColourId, colours::text);
    setColour (juce::Slider::textBoxTextColourId, colours::text);
    setColour (juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
    setColour (juce::Slider::textBoxBackgroundColourId, juce::Colours::transparentBlack);
    setColour (juce::ToggleButton::textColourId, colours::text);
    setColour (juce::ToggleButton::tickColourId, colours::gold);
}

void LookAndFeel::drawRotarySlider (juce::Graphics& g, int x, int y, int w, int h, float pos, float start, float end, juce::Slider& s)
{
    auto r = juce::Rectangle<int> (x, y, w, h).toFloat().reduced (4.0f);
    const float d = juce::jmin (r.getWidth(), r.getHeight());
    r = r.withSizeKeepingCentre (d, d);
    const auto c = r.getCentre();
    const float radius = d / 2.0f;
    const float angle = start + pos * (end - start);
    const auto accent = s.isEnabled() ? colours::gold : colours::muted;

    juce::Path track;
    track.addCentredArc (c.x, c.y, radius - 2.0f, radius - 2.0f, 0.0f, start, end, true);
    g.setColour (colours::line);
    g.strokePath (track, juce::PathStrokeType (3.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    juce::Path value;
    value.addCentredArc (c.x, c.y, radius - 2.0f, radius - 2.0f, 0.0f, start, angle, true);
    g.setColour (accent);
    g.strokePath (value, juce::PathStrokeType (3.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));

    const float knob = radius - 7.0f;
    g.setGradientFill (juce::ColourGradient (juce::Colour (0xff2b2f3b), c.x, c.y - knob, juce::Colour (0xff14161c), c.x, c.y + knob, false));
    g.fillEllipse (c.x - knob, c.y - knob, knob * 2, knob * 2);
    g.setColour (colours::line.brighter (0.2f));
    g.drawEllipse (c.x - knob, c.y - knob, knob * 2, knob * 2, 1.0f);
    juce::Path ptr;
    ptr.addRoundedRectangle (-1.5f, -knob + 2.0f, 3.0f, knob * 0.55f, 1.5f);
    g.setColour (accent);
    g.fillPath (ptr, juce::AffineTransform::rotation (angle).translated (c.x, c.y));
}

void LookAndFeel::drawButtonBackground (juce::Graphics& g, juce::Button& b, const juce::Colour&, bool over, bool down)
{
    auto r = b.getLocalBounds().toFloat().reduced (0.5f);
    const bool primary = b.getProperties()["primary"];
    juce::Colour top = primary ? juce::Colour (0xfff1c94a) : juce::Colour (0xff262a36);
    juce::Colour bottom = primary ? juce::Colour (0xffd9a520) : juce::Colour (0xff1d2029);
    if (over)
    {
        top = top.brighter (0.08f);
        bottom = bottom.brighter (0.08f);
    }
    if (down)
        std::swap (top, bottom);
    g.setGradientFill (juce::ColourGradient (top, 0, r.getY(), bottom, 0, r.getBottom(), false));
    g.fillRoundedRectangle (r, 6.0f);
    g.setColour (primary ? juce::Colour (0xfff1c94a) : (over ? juce::Colour (0xff4a5063) : colours::line));
    g.drawRoundedRectangle (r, 6.0f, 1.0f);
    b.setColour (juce::TextButton::textColourOffId, primary ? juce::Colour (0xff14110a) : (b.isEnabled() ? colours::text : colours::muted));
}

void LookAndFeel::drawToggleButton (juce::Graphics& g, juce::ToggleButton& b, bool over, bool)
{
    auto r = b.getLocalBounds().toFloat();
    auto box = r.removeFromLeft (r.getHeight()).reduced (r.getHeight() * 0.22f);
    g.setColour (b.getToggleState() ? colours::gold : colours::bg);
    g.fillRoundedRectangle (box, 3.0f);
    g.setColour (b.getToggleState() ? colours::gold : (over ? colours::muted : colours::line.brighter (0.3f)));
    g.drawRoundedRectangle (box, 3.0f, 1.0f);
    if (b.getToggleState())
    {
        juce::Path tick;
        tick.startNewSubPath (box.getX() + box.getWidth() * 0.22f, box.getCentreY());
        tick.lineTo (box.getX() + box.getWidth() * 0.43f, box.getBottom() - box.getHeight() * 0.25f);
        tick.lineTo (box.getRight() - box.getWidth() * 0.2f, box.getY() + box.getHeight() * 0.25f);
        g.setColour (colours::bg);
        g.strokePath (tick, juce::PathStrokeType (2.0f));
    }
    const bool heading = b.getProperties()["heading"];
    g.setColour (heading ? colours::gold : colours::text);
    g.setFont (juce::FontOptions (heading ? 12.0f : 13.0f, heading ? juce::Font::bold : juce::Font::plain));
    g.drawFittedText (b.getButtonText(), r.toNearestInt().withTrimmedLeft (4), juce::Justification::centredLeft, 1);
}

juce::Font LookAndFeel::getTextButtonFont (juce::TextButton& b, int)
{
    return juce::FontOptions (13.0f, b.getProperties()["primary"] ? juce::Font::bold : juce::Font::plain);
}

// ---- pads ---------------------------------------------------------------------------

PadView::PadView (KbkStudioProcessor& p, int i) : proc (p), index (i) {}

void PadView::decay()
{
    if (flashLevel > 0.0f)
    {
        flashLevel = juce::jmax (0.0f, flashLevel - 0.12f);
        repaint();
    }
}

void PadView::paint (juce::Graphics& g)
{
    const auto pad = proc.sampler.getPad (index);
    const auto c = padColour (index);
    auto r = getLocalBounds().toFloat().reduced (2.0f);
    g.setGradientFill (juce::ColourGradient (juce::Colour (0xff2b2f3b), r.getX(), r.getY(), juce::Colour (0xff15171e), r.getRight(), r.getBottom(), false));
    g.fillRoundedRectangle (r, 9.0f);
    if (flashLevel > 0.0f)
    {
        g.setColour (c.withAlpha (0.45f * flashLevel));
        g.fillRoundedRectangle (r, 9.0f);
    }
    const float border = selected ? 2.0f : 1.0f;
    g.setColour (dragOver || learning ? colours::gold.brighter (0.3f) : selected ? c : pad.loaded() ? c.withAlpha (0.45f) : colours::line);
    g.drawRoundedRectangle (r.reduced (border / 2), 9.0f, border);

    auto inner = r.reduced (8.0f, 6.0f);
    auto top = inner.removeFromTop (16.0f);
    g.setFont (juce::FontOptions (12.0f, juce::Font::bold));
    g.setColour (pad.loaded() ? c : colours::muted);
    g.drawText (juce::String (index + 1), top, juce::Justification::centredLeft);
    g.setFont (juce::FontOptions (10.0f));
    g.setColour (colours::muted.withAlpha (0.8f));
    g.drawText (noteName, top, juce::Justification::centredRight);

    auto nameArea = inner.removeFromBottom (16.0f);
    g.setFont (juce::FontOptions (11.5f, pad.loaded() ? juce::Font::bold : juce::Font::plain));
    g.setColour (pad.loaded() ? colours::text : colours::muted.withAlpha (0.6f));
    g.drawFittedText (learning ? juce::String ("Press a key...") : pad.loaded() ? pad.name : juce::String ("empty"),
                      nameArea.toNearestInt(), juce::Justification::centredLeft, 1, 0.8f);

    if (pad.loaded())
    {
        auto w = inner.reduced (0.0f, 4.0f);
        const auto& a = *pad.audio;
        const int cols = juce::jmax (1, (int) w.getWidth());
        const int n = a.getNumSamples();
        g.setColour (c.withAlpha (0.8f));
        for (int x = 0; x < cols; ++x)
        {
            const int s0 = (int) ((juce::int64) x * n / cols), s1 = juce::jmax (s0 + 1, (int) ((juce::int64) (x + 1) * n / cols));
            const float pk = a.getMagnitude (0, s0, juce::jmin (s1, n) - s0);
            const float hgt = juce::jmax (1.0f, pk * w.getHeight());
            g.fillRect (w.getX() + (float) x, w.getCentreY() - hgt / 2, 1.0f, hgt);
        }
    }
}

void PadView::mouseDown (const juce::MouseEvent& e)
{
    if (onSelect)
        onSelect (index);
    // lower on the pad = softer, like a velocity-sensitive pad
    const float vel = proc.sampler.velocitySensitive ? juce::jlimit (0.15f, 1.0f, 1.0f - (float) e.y / (float) getHeight() * 0.7f) : 1.0f;
    proc.sampler.queueHit (index, vel, true);
}

void PadView::mouseUp (const juce::MouseEvent&)
{
    proc.sampler.queueHit (index, 0.0f, false);
}

// ---- waveform -------------------------------------------------------------------------

void WaveView::paint (juce::Graphics& g)
{
    auto r = getLocalBounds().toFloat();
    g.setColour (juce::Colour (0xff0a0b0f));
    g.fillRoundedRectangle (r, 8.0f);
    g.setColour (colours::line);
    g.drawRoundedRectangle (r.reduced (0.5f), 8.0f, 1.0f);
    const auto p = proc.sampler.getPad (pad);
    if (! p.loaded())
    {
        g.setColour (colours::muted);
        g.setFont (juce::FontOptions (13.0f));
        g.drawFittedText ("Drop a song, loop or sample here, paste a link below, or open a file.\nSongs and loops are chopped across all 16 pads.",
                          getLocalBounds().reduced (12), juce::Justification::centred, 3);
        return;
    }
    const auto& a = *p.audio;
    const int n = a.getNumSamples();
    const int w = getWidth();
    const float mid = r.getCentreY(), half = r.getHeight() * 0.45f;
    const float s0 = juce::jmin (p.start, p.end) * (float) w, s1 = juce::jmax (p.start, p.end) * (float) w;
    const auto c = padColour (pad);
    for (int x = 0; x < w; ++x)
    {
        const int a0 = (int) ((juce::int64) x * n / w), a1 = juce::jmax (a0 + 1, (int) ((juce::int64) (x + 1) * n / w));
        float lo = 0.0f, hi = 0.0f;
        for (int ch = 0; ch < a.getNumChannels(); ++ch)
        {
            auto mm = a.findMinMax (ch, a0, juce::jmin (a1, n) - a0);
            lo = juce::jmin (lo, mm.getStart());
            hi = juce::jmax (hi, mm.getEnd());
        }
        const int xi = p.reverse ? w - 1 - x : x;
        g.setColour ((float) xi >= s0 && (float) xi <= s1 ? c : juce::Colour (0xff3a3f4d));
        g.fillRect ((float) xi, mid - hi * half, 1.0f, juce::jmax (1.0f, (hi - lo) * half));
    }
    g.setColour (juce::Colours::black.withAlpha (0.35f));
    g.fillRect (0.0f, 0.0f, s0, r.getHeight());
    g.fillRect (s1, 0.0f, (float) w - s1, r.getHeight());
    g.setColour (colours::gold.brighter (0.3f));
    g.fillRect (s0, 0.0f, 2.0f, r.getHeight());
    g.fillRect (s1 - 2.0f, 0.0f, 2.0f, r.getHeight());
    g.setColour (colours::muted);
    g.setFont (juce::FontOptions (11.0f));
    g.drawText (juce::String (p.seconds() * std::abs (p.end - p.start), 2) + " s - drag the gold lines to trim",
                getLocalBounds().reduced (8, 4), juce::Justification::bottomRight);
}

void WaveView::mouseDown (const juce::MouseEvent& e)
{
    const auto p = proc.sampler.getPad (pad);
    if (! p.loaded())
        return;
    const float x = (float) e.x / (float) getWidth();
    draggingStart = std::abs (x - p.start) < std::abs (x - p.end);
    mouseDrag (e);
}

void WaveView::mouseDrag (const juce::MouseEvent& e)
{
    const float x = juce::jlimit (0.0f, 1.0f, (float) e.x / (float) getWidth());
    proc.updatePad (pad, [&] (kbk::Pad& pd) { (draggingStart ? pd.start : pd.end) = x; });
    repaint();
    if (onChange)
        onChange();
}

// ---- editor -------------------------------------------------------------------------------

void KbkStudioEditor::setupKnob (Knob& k, const juce::String& name, const juce::String& paramId)
{
    k.slider.setTextBoxStyle (juce::Slider::TextBoxBelow, false, 64, 16);
    k.slider.setColour (juce::Slider::textBoxTextColourId, colours::text);
    k.slider.setColour (juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
    k.slider.setColour (juce::Slider::textBoxBackgroundColourId, juce::Colours::transparentBlack);
    addAndMakeVisible (k.slider);
    k.label.setText (name.toUpperCase(), juce::dontSendNotification);
    k.label.setFont (juce::FontOptions (10.0f, juce::Font::bold));
    k.label.setColour (juce::Label::textColourId, colours::muted);
    k.label.setJustificationType (juce::Justification::centred);
    addAndMakeVisible (k.label);
    if (paramId.isNotEmpty())
    {
        k.attachment = std::make_unique<SliderAttachment> (proc.params, paramId, k.slider);
    }
}

KbkStudioEditor::KbkStudioEditor (KbkStudioProcessor& p) : AudioProcessorEditor (p), proc (p)
{
    setLookAndFeel (&lnf);

    for (int i = 0; i < kbk::numPads; ++i)
    {
        pads[(size_t) i] = std::make_unique<PadView> (proc, i);
        pads[(size_t) i]->onSelect = [this] (int idx) { selectPad (idx); };
        addAndMakeVisible (*pads[(size_t) i]);
        seenHits[(size_t) i] = proc.sampler.hits[(size_t) i].load();
    }

    // auto-chop row
    for (auto* t : { &autoChopToggle, &chopCutToggle })
        addAndMakeVisible (t);
    autoChopToggle.getProperties().set ("heading", true);
    autoChopToggle.setToggleState (proc.autoChop, juce::dontSendNotification);
    chopCutToggle.setToggleState (proc.chopCut, juce::dontSendNotification);
    autoChopToggle.onClick = [this] { proc.autoChop = autoChopToggle.getToggleState(); };
    chopCutToggle.onClick = [this] { proc.chopCut = chopCutToggle.getToggleState(); };
    addAndMakeVisible (undoButton);
    undoButton.onClick = [this] { proc.undoChop(); refreshEditor(); };

    // keyboard row
    keyModeLabel.setText ("Keyboard", juce::dontSendNotification);
    baseNoteLabel.setText ("Pad 1 note", juce::dontSendNotification);
    for (auto* l : { &keyModeLabel, &baseNoteLabel, &midiLabel })
    {
        l->setColour (juce::Label::textColourId, colours::muted);
        l->setFont (juce::FontOptions (12.0f));
        addAndMakeVisible (l);
    }
    keyModeBox.addItemList ({ "Pads", "Keys", "Split" }, 1);
    keyModeAttachment = std::make_unique<ComboAttachment> (proc.params, "keyMode", keyModeBox);
    addAndMakeVisible (keyModeBox);
    for (int n = 0; n <= 112; ++n)
        baseNoteBox.addItem (noteToName (n) + " (" + juce::String (n) + ")", n + 1);
    baseNoteBox.onChange = [this]
    {
        if (refreshing)
            return;
        auto* prm = proc.params.getParameter ("baseNote");
        prm->setValueNotifyingHost (prm->convertTo0to1 ((float) (baseNoteBox.getSelectedId() - 1)));
    };
    addAndMakeVisible (baseNoteBox);
    addAndMakeVisible (learnBaseButton);
    learnBaseButton.onClick = [this]
    {
        learnTarget = learnTarget == -2 ? -1 : -2;
        proc.sampler.learnPad = learnTarget;
        refreshEditor();
    };
    velocityAttachment = std::make_unique<ButtonAttachment> (proc.params, "velocity", velocityToggle);
    addAndMakeVisible (velocityToggle);
    addAndMakeVisible (stopButton);
    stopButton.onClick = [this] { proc.sampler.stopAll(); };

    // pad editor
    padTitle.setFont (juce::FontOptions (15.0f, juce::Font::bold));
    addAndMakeVisible (padTitle);
    playButton.getProperties().set ("primary", true);
    playButton.onClick = [this]
    {
        const int i = proc.sampler.selectedPad;
        proc.sampler.queueHit (i, 1.0f, true);
        juce::Timer::callAfterDelay (1200, [safe = juce::Component::SafePointer<KbkStudioEditor> (this), i]
                                     { if (safe != nullptr) safe->proc.sampler.queueHit (i, 0.0f, false); });
    };
    addAndMakeVisible (playButton);
    wave.onChange = [this] { pads[(size_t) proc.sampler.selectedPad.load()]->repaint(); };
    addAndMakeVisible (wave);

    urlBox.setTextToShowWhenEmpty ("Paste a link: YouTube, SoundCloud, Dropbox, Drive, or a .wav/.mp3 file", colours::muted);
    urlBox.onReturnKey = [this] { urlButton.triggerClick(); };
    addAndMakeVisible (urlBox);
    urlButton.getProperties().set ("primary", true);
    urlButton.onClick = [this]
    {
        if (urlBox.getText().trim().isNotEmpty())
            proc.loadUrl (urlBox.getText(), proc.sampler.selectedPad);
    };
    addAndMakeVisible (urlButton);
    openButton.onClick = [this]
    {
        chooser = std::make_unique<juce::FileChooser> ("Open audio", juce::File(), "*.wav;*.aif;*.aiff;*.mp3;*.flac;*.ogg;*.m4a;*.caf;*.mp4;*.mov");
        chooser->launchAsync (juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles,
                              [this] (const juce::FileChooser& fc)
                              {
                                  if (fc.getResult().existsAsFile())
                                      proc.loadFile (fc.getResult(), proc.sampler.selectedPad);
                              });
    };
    addAndMakeVisible (openButton);
    chopBox.addItemList ({ "Smart chop", "Chop by hits", "4 equal slices", "8 equal slices", "16 equal slices" }, 1);
    chopBox.setSelectedId (1, juce::dontSendNotification);
    addAndMakeVisible (chopBox);
    chopButton.onClick = [this] { proc.chopPad (proc.sampler.selectedPad, chopHow()); refreshEditor(); };
    addAndMakeVisible (chopButton);
    clearButton.onClick = [this] { proc.clearPad (proc.sampler.selectedPad); refreshEditor(); };
    addAndMakeVisible (clearButton);
    exportButton.onClick = [this]
    {
        const int i = proc.sampler.selectedPad;
        const auto pad = proc.sampler.getPad (i);
        if (! pad.loaded())
            return;
        chooser = std::make_unique<juce::FileChooser> ("Export pad", juce::File::getSpecialLocation (juce::File::userMusicDirectory)
                                                                          .getChildFile (juce::File::createLegalFileName (pad.name) + ".wav"), "*.wav");
        chooser->launchAsync (juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::warnAboutOverwriting,
                              [this, i] (const juce::FileChooser& fc)
                              {
                                  if (fc.getResult() != juce::File())
                                      proc.exportPad (i, fc.getResult().withFileExtension ("wav"));
                              });
    };
    addAndMakeVisible (exportButton);

    setupKnob (level, "Level");
    level.slider.setRange (0.0, 1.5, 0.01);
    level.slider.setNumDecimalPlacesToDisplay (2);
    level.slider.onValueChange = [this] { if (! refreshing) proc.updatePad (proc.sampler.selectedPad, [v = (float) level.slider.getValue()] (kbk::Pad& pad) { pad.gain = v; }); };
    setupKnob (tune, "Tune");
    tune.slider.setRange (-24.0, 24.0, 1.0);
    tune.slider.setTextValueSuffix (" st");
    tune.slider.onValueChange = [this] { if (! refreshing) proc.updatePad (proc.sampler.selectedPad, [v = (float) tune.slider.getValue()] (kbk::Pad& pad) { pad.tune = v; }); };
    setupKnob (pan, "Pan");
    pan.slider.setRange (-1.0, 1.0, 0.01);
    pan.slider.setNumDecimalPlacesToDisplay (2);
    pan.slider.onValueChange = [this] { if (! refreshing) proc.updatePad (proc.sampler.selectedPad, [v = (float) pan.slider.getValue()] (kbk::Pad& pad) { pad.pan = v; }); };

    modeLabel.setText ("Play", juce::dontSendNotification);
    chokeLabel.setText ("Choke", juce::dontSendNotification);
    for (auto* l : { &modeLabel, &chokeLabel, &noteLabel })
    {
        l->setColour (juce::Label::textColourId, colours::muted);
        l->setFont (juce::FontOptions (12.0f));
        addAndMakeVisible (l);
    }
    modeBox.addItemList ({ "One-shot", "Hold (gate)", "Loop" }, 1);
    modeBox.onChange = [this] { if (! refreshing) proc.updatePad (proc.sampler.selectedPad, [v = modeBox.getSelectedId() - 1] (kbk::Pad& pad) { pad.mode = (kbk::PlayMode) v; }); };
    addAndMakeVisible (modeBox);
    chokeBox.addItemList ({ "Off", "Group 1", "Group 2", "Group 3", "Group 4 (chops)" }, 1);
    chokeBox.onChange = [this] { if (! refreshing) proc.updatePad (proc.sampler.selectedPad, [v = chokeBox.getSelectedId() - 1] (kbk::Pad& pad) { pad.choke = v; }); };
    addAndMakeVisible (chokeBox);
    reverseToggle.onClick = [this] { proc.updatePad (proc.sampler.selectedPad, [v = reverseToggle.getToggleState()] (kbk::Pad& pad) { pad.reverse = v; }); refreshEditor(); };
    addAndMakeVisible (reverseToggle);
    learnButton.onClick = [this]
    {
        const int i = proc.sampler.selectedPad;
        learnTarget = learnTarget == i ? -1 : i;
        proc.sampler.learnPad = learnTarget;
        refreshEditor();
    };
    addAndMakeVisible (learnButton);

    // AI Vox
    voxHeading.setText ("AI VOX  -  voice conversion", juce::dontSendNotification);
    voxHeading.setFont (juce::FontOptions (12.0f, juce::Font::bold));
    voxHeading.setColour (juce::Label::textColourId, colours::gold);
    addAndMakeVisible (voxHeading);
    voiceBox.setTextWhenNothingSelected ("Target voice...");
    voiceBox.setTextWhenNoChoicesAvailable ("No voices yet - press Rescan");
    voiceBox.onChange = [this]
    {
        if (! refreshing && voiceBox.getSelectedItemIndex() >= 0)
            proc.voxVoice = proc.voices[voiceBox.getSelectedItemIndex()];
    };
    addAndMakeVisible (voiceBox);
    voxRescan.onClick = [this] { proc.refreshVoices(); };
    addAndMakeVisible (voxRescan);
    voxFolder.onClick = [this]
    {
        if (proc.voicesFolder.isEmpty())
        {
            proc.refreshVoices();
            return;
        }
        juce::File dir (proc.voicesFolder);
        dir.createDirectory();
        dir.startAsProcess(); // opens it in Finder
    };
    addAndMakeVisible (voxFolder);
    voxPitchLabel.setText ("Pitch", juce::dontSendNotification);
    voxPitchLabel.setColour (juce::Label::textColourId, colours::muted);
    voxPitchLabel.setFont (juce::FontOptions (12.0f));
    addAndMakeVisible (voxPitchLabel);
    voxPitch.setRange (-24.0, 24.0, 1.0);
    voxPitch.setTextValueSuffix (" st");
    voxPitch.setTextBoxStyle (juce::Slider::TextBoxRight, false, 52, 22);
    voxPitch.setColour (juce::Slider::trackColourId, colours::purple);
    voxPitch.setColour (juce::Slider::thumbColourId, colours::gold);
    voxPitch.setColour (juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
    voxPitch.onValueChange = [this] { proc.voxPitch = (int) voxPitch.getValue(); };
    addAndMakeVisible (voxPitch);
    voxButton.getProperties().set ("primary", true);
    voxButton.onClick = [this] { proc.aiVox (proc.sampler.selectedPad); refreshEditor(); };
    addAndMakeVisible (voxButton);

    // Neural Tone
    ampButton.onClick = [this]
    {
        chooser = std::make_unique<juce::FileChooser> ("Load a Neural Amp Modeler capture", juce::File(), "*.nam;*.json");
        chooser->launchAsync (juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles,
                              [this] (const juce::FileChooser& fc)
                              {
                                  if (fc.getResult().existsAsFile())
                                      proc.loadAmp (fc.getResult());
                              });
    };
    addAndMakeVisible (ampButton);
    ampLabel.setFont (juce::FontOptions (11.0f));
    ampLabel.setColour (juce::Label::textColourId, colours::muted);
    addAndMakeVisible (ampLabel);
    setupKnob (ntIn, "In", "ntIn");
    setupKnob (ntDrive, "Drive", "ntDrive");
    setupKnob (ntMix, "Mix", "ntMix");
    setupKnob (ntOut, "Out", "ntOut");

    // master strip
    for (auto* t : { &ntOn, &glueOn, &tapeOn, &limOn })
    {
        t->getProperties().set ("heading", true);
        addAndMakeVisible (t);
    }
    ntOnA = std::make_unique<ButtonAttachment> (proc.params, "ntOn", ntOn);
    glueOnA = std::make_unique<ButtonAttachment> (proc.params, "glueOn", glueOn);
    tapeOnA = std::make_unique<ButtonAttachment> (proc.params, "tapeOn", tapeOn);
    limOnA = std::make_unique<ButtonAttachment> (proc.params, "limOn", limOn);
    setupKnob (glueThresh, "Thresh", "glueThresh");
    setupKnob (glueRatio, "Ratio", "glueRatio");
    setupKnob (glueAttack, "Attack", "glueAttack");
    setupKnob (glueRelease, "Release", "glueRelease");
    setupKnob (glueMakeup, "Makeup", "glueMakeup");
    setupKnob (glueMix, "Mix", "glueMix");
    setupKnob (tapeDrive, "Drive", "tapeDrive");
    setupKnob (tapeWarmth, "Warmth", "tapeWarmth");
    setupKnob (limCeiling, "Ceiling", "limCeiling");
    setupKnob (limRelease, "Release", "limRelease");
    setupKnob (master, "Master", "master");

    status.setFont (juce::FontOptions (12.5f));
    addAndMakeVisible (status);
    helperLabel.setFont (juce::FontOptions (12.0f));
    helperLabel.setJustificationType (juce::Justification::centredRight);
    addAndMakeVisible (helperLabel);

    proc.addChangeListener (this);
    proc.checkHelper();
    proc.refreshVoices();
    setSize (1240, 846);
    refreshEditor();
    startTimerHz (30);
}

KbkStudioEditor::~KbkStudioEditor()
{
    proc.sampler.learnPad = -1;
    proc.removeChangeListener (this);
    setLookAndFeel (nullptr);
}

KbkStudioProcessor::ChopHow KbkStudioEditor::chopHow() const
{
    switch (chopBox.getSelectedId())
    {
        case 2: return KbkStudioProcessor::ChopHow::Hits;
        case 3: return KbkStudioProcessor::ChopHow::Equal4;
        case 4: return KbkStudioProcessor::ChopHow::Equal8;
        case 5: return KbkStudioProcessor::ChopHow::Equal16;
        default: return KbkStudioProcessor::ChopHow::Smart;
    }
}

void KbkStudioEditor::selectPad (int i)
{
    proc.sampler.selectedPad = i;
    refreshEditor();
}

void KbkStudioEditor::refreshEditor()
{
    refreshing = true;
    const int sel = proc.sampler.selectedPad;
    const auto notes = proc.sampler.getPadNotes();
    for (int i = 0; i < kbk::numPads; ++i)
    {
        auto& pv = *pads[(size_t) i];
        pv.selected = i == sel;
        pv.learning = learnTarget == i;
        pv.dragOver = dropPad == i;
        pv.noteName = noteToName (notes[(size_t) i]);
        pv.repaint();
    }
    const auto p = proc.sampler.getPad (sel);
    padTitle.setText ("PAD " + juce::String (sel + 1) + (p.name.isNotEmpty() ? " - " + p.name : juce::String()), juce::dontSendNotification);
    wave.setPad (sel);
    level.slider.setValue (p.gain, juce::dontSendNotification);
    tune.slider.setValue (p.tune, juce::dontSendNotification);
    pan.slider.setValue (p.pan, juce::dontSendNotification);
    modeBox.setSelectedId ((int) p.mode + 1, juce::dontSendNotification);
    chokeBox.setSelectedId (p.choke + 1, juce::dontSendNotification);
    reverseToggle.setToggleState (p.reverse, juce::dontSendNotification);
    noteLabel.setText ("MIDI note  " + noteToName (notes[(size_t) sel]) + " (" + juce::String (notes[(size_t) sel]) + ")", juce::dontSendNotification);
    learnButton.setButtonText (learnTarget == sel ? "Press a key..." : "Learn note");
    learnBaseButton.setButtonText (learnTarget == -2 ? "Press a key..." : "Learn from key");
    for (auto* b : { &playButton, &exportButton, &chopButton, &clearButton })
        b->setEnabled (p.loaded());
    undoButton.setEnabled (proc.canUndo());
    baseNoteBox.setSelectedId ((int) proc.params.getRawParameterValue ("baseNote")->load() + 1, juce::dontSendNotification);
    autoChopToggle.setToggleState (proc.autoChop, juce::dontSendNotification);
    chopCutToggle.setToggleState (proc.chopCut, juce::dontSendNotification);
    status.setText (proc.statusText, juce::dontSendNotification);
    status.setColour (juce::Label::textColourId, proc.statusError ? juce::Colour (0xffff9a9a) : proc.busy ? colours::gold : juce::Colour (0xff86efac));
    const int hs = proc.helperState;
    helperLabel.setText (hs == 1 ? "KBK helper: connected" : hs == 0 ? "KBK helper: off (needed for YouTube links)" : "KBK helper: checking...",
                         juce::dontSendNotification);
    helperLabel.setColour (juce::Label::textColourId, hs == 1 ? colours::green : colours::muted);
    urlButton.setEnabled (! proc.busy);

    voiceBox.clear (juce::dontSendNotification);
    voiceBox.addItemList (proc.voices, 1);
    if (const int vi = proc.voices.indexOf (proc.voxVoice); vi >= 0)
        voiceBox.setSelectedItemIndex (vi, juce::dontSendNotification);
    voxPitch.setValue (proc.voxPitch, juce::dontSendNotification);
    voxButton.setEnabled (p.loaded() && ! proc.voxBusy);
    voxButton.setButtonText (proc.voxBusy ? "Converting..." : "AI Vox");
    ampLabel.setText (proc.ampName.isNotEmpty() ? proc.ampName : juce::String ("no amp loaded (.nam / .json)"), juce::dontSendNotification);
    ampLabel.setColour (juce::Label::textColourId, proc.ampName.isNotEmpty() ? colours::text : colours::muted);
    refreshing = false;
}

void KbkStudioEditor::changeListenerCallback (juce::ChangeBroadcaster*)
{
    refreshEditor();
}

void KbkStudioEditor::timerCallback()
{
    for (int i = 0; i < kbk::numPads; ++i)
    {
        const auto h = proc.sampler.hits[(size_t) i].load();
        if (h != seenHits[(size_t) i])
        {
            seenHits[(size_t) i] = h;
            pads[(size_t) i]->flash();
        }
        else
            pads[(size_t) i]->decay();
    }
    // MIDI learn finished on the audio thread
    const int learned = proc.sampler.learnedNote.exchange (-1);
    if (learned >= 0 && learnTarget != -1)
    {
        if (learnTarget == -2)
        {
            auto* prm = proc.params.getParameter ("baseNote");
            prm->setValueNotifyingHost (prm->convertTo0to1 ((float) juce::jmin (112, learned)));
        }
        else
        {
            auto notes = proc.sampler.getPadNotes();
            for (auto& n : notes)
                if (n == learned)
                    n = notes[(size_t) learnTarget]; // swap with the pad that had it
            notes[(size_t) learnTarget] = learned;
            proc.sampler.setPadNotes (notes);
        }
        learnTarget = -1;
        refreshEditor();
    }
    const int ln = proc.sampler.lastNote;
    midiLabel.setText (ln >= 0 ? "Last key: " + noteToName (ln) + " - vel " + juce::String (proc.sampler.lastVelocity.load()) : juce::String ("Play a key on your keyboard"),
                       juce::dontSendNotification);
    const float pk = proc.sampler.outputPeak;
    if (std::abs (pk - meter) > 0.01f)
    {
        meter = pk;
        repaint (getWidth() - 150, 22, 130, 10);
    }
    // keep the selected pad / state in sync when Logic or MIDI changes it
    if (proc.sampler.selectedPad != lastSel)
    {
        lastSel = proc.sampler.selectedPad;
        refreshEditor();
    }
}

int KbkStudioEditor::padAt (int x, int y) const
{
    for (int i = 0; i < kbk::numPads; ++i)
        if (pads[(size_t) i]->getBounds().contains (x, y))
            return i;
    if (wave.getBounds().contains (x, y))
        return proc.sampler.selectedPad;
    return -1;
}

void KbkStudioEditor::highlightDrop (int x, int y)
{
    const int p = x < 0 ? -1 : padAt (x, y);
    if (p != dropPad)
    {
        dropPad = p;
        refreshEditor();
    }
}

void KbkStudioEditor::filesDropped (const juce::StringArray& files, int x, int y)
{
    const int p = padAt (x, y);
    highlightDrop (-1, -1);
    const juce::File f (files[0]);
    if (f.existsAsFile())
        proc.loadFile (f, p >= 0 ? p : proc.sampler.selectedPad.load());
}

void KbkStudioEditor::textDropped (const juce::String& text, int x, int y)
{
    const int p = padAt (x, y);
    highlightDrop (-1, -1);
    const auto url = text.upToFirstOccurrenceOf ("\n", false, false).trim();
    if (url.isNotEmpty())
    {
        urlBox.setText (url);
        proc.loadUrl (url, p >= 0 ? p : proc.sampler.selectedPad.load());
    }
}

// ---- layout & paint ---------------------------------------------------------------------

void KbkStudioEditor::paint (juce::Graphics& g)
{
    g.fillAll (colours::bg);
    auto b = getLocalBounds();

    // header
    auto head = b.removeFromTop (54);
    g.setGradientFill (juce::ColourGradient (juce::Colour (0xff15171f), 0, 0, juce::Colour (0xff0f1117), 0, 54, false));
    g.fillRect (head);
    g.setColour (colours::line);
    g.drawHorizontalLine (53, 0.0f, (float) getWidth());
    auto logo = juce::Rectangle<float> (16.0f, 9.0f, 36.0f, 36.0f);
    g.setGradientFill (juce::ColourGradient (juce::Colour (0xff6d3fe0), logo.getX(), logo.getY(), juce::Colour (0xff2a1a4d), logo.getRight(), logo.getBottom(), false));
    g.fillRoundedRectangle (logo, 9.0f);
    g.setColour (colours::gold.withAlpha (0.5f));
    g.drawRoundedRectangle (logo, 9.0f, 1.0f);
    g.setColour (colours::gold);
    g.setFont (juce::FontOptions (19.0f, juce::Font::bold));
    g.drawText ("K", logo, juce::Justification::centred);
    g.setFont (juce::FontOptions (17.0f, juce::Font::bold));
    g.drawText ("K B K   S T U D I O", 64, 10, 260, 20, juce::Justification::left);
    g.setColour (colours::muted);
    g.setFont (juce::FontOptions (10.0f));
    g.drawText ("K N I G H T   L Y F E   U L T I M A T E", 64, 30, 300, 14, juce::Justification::left);

    // meter
    auto m = juce::Rectangle<float> ((float) getWidth() - 150.0f, 22.0f, 130.0f, 8.0f);
    g.setColour (colours::bg);
    g.fillRoundedRectangle (m, 4.0f);
    g.setGradientFill (juce::ColourGradient (colours::green, m.getX(), 0, colours::red, m.getRight(), 0, false));
    g.fillRoundedRectangle (m.withWidth (m.getWidth() * juce::jmin (1.0f, meter)), 4.0f);
    g.setColour (colours::muted);
    g.setFont (juce::FontOptions (9.0f, juce::Font::bold));
    g.drawText ("OUT", (int) m.getX() - 34, 18, 30, 16, juce::Justification::centredRight);

    // panels
    auto panelAt = [&] (juce::Rectangle<int> r, const juce::String& title)
    {
        g.setColour (colours::panel);
        g.fillRoundedRectangle (r.toFloat(), 10.0f);
        g.setColour (colours::line);
        g.drawRoundedRectangle (r.toFloat().reduced (0.5f), 10.0f, 1.0f);
        if (title.isNotEmpty())
        {
            g.setColour (colours::gold);
            g.fillRoundedRectangle ((float) r.getX() + 14.0f, (float) r.getY() + 15.0f, 3.0f, 13.0f, 1.5f);
            g.setColour (colours::text);
            g.setFont (juce::FontOptions (13.0f, juce::Font::bold));
            g.drawText (title, r.getX() + 24, r.getY() + 12, 300, 20, juce::Justification::left);
        }
    };
    const auto padsPanel = padArea.expanded (14).withTop (66).withBottom (padArea.getBottom() + 112);
    panelAt (padsPanel, "PADS");
    g.setColour (juce::Colour (0xff0a0b0f));
    g.fillRoundedRectangle (padArea.expanded (8).toFloat(), 10.0f);
    // chop row highlight
    auto chopRow = juce::Rectangle<int> (padArea.getX() - 6, padArea.getBottom() + 14, padArea.getWidth() + 12, 34);
    g.setColour (colours::gold.withAlpha (0.07f));
    g.fillRoundedRectangle (chopRow.toFloat(), 8.0f);
    g.setColour (colours::gold.withAlpha (0.25f));
    g.drawRoundedRectangle (chopRow.toFloat(), 8.0f, 1.0f);

    const int ex = padsPanel.getRight() + 14;
    panelAt ({ ex, 66, getWidth() - ex - 14, padsPanel.getHeight() }, {});
    panelAt ({ 14, padsPanel.getBottom() + 12, getWidth() - 28, getHeight() - padsPanel.getBottom() - 12 - 40 }, {});

    // master section dividers
    g.setColour (colours::line);
    for (auto* t : std::initializer_list<juce::Component*> { &glueOn, &tapeOn, &limOn, &master.label })
        g.fillRect (t->getX() - 12, padsPanel.getBottom() + 24, 1, getHeight() - padsPanel.getBottom() - 76);
}

void KbkStudioEditor::resized()
{
    const int padSize = 100, gap = 10;
    padArea = { 28, 108, padSize * 4 + gap * 3, padSize * 4 + gap * 3 };
    for (int k = 0; k < 16; ++k)
    {
        const int i = gridOrder[k];
        pads[(size_t) i]->setBounds (padArea.getX() + (k % 4) * (padSize + gap), padArea.getY() + (k / 4) * (padSize + gap), padSize, padSize);
    }
    // header right: keyboard mode
    keyModeLabel.setBounds (360, 16, 62, 22);
    keyModeBox.setBounds (424, 15, 90, 24);
    midiLabel.setBounds (526, 16, 230, 22);
    helperLabel.setBounds (getWidth() - 470, 16, 270, 22);

    // under the pads: the chop row, then the keyboard row
    int y = padArea.getBottom() + 18;
    autoChopToggle.setBounds (padArea.getX(), y, 196, 26);
    chopCutToggle.setBounds (padArea.getX() + 198, y, 180, 26);
    undoButton.setBounds (padArea.getRight() - 64, y, 64, 26);
    y += 40;
    baseNoteLabel.setBounds (padArea.getX(), y, 66, 26);
    baseNoteBox.setBounds (padArea.getX() + 66, y, 96, 26);
    learnBaseButton.setBounds (padArea.getX() + 168, y, 104, 26);
    velocityToggle.setBounds (padArea.getX() + 280, y, 84, 26);
    stopButton.setBounds (padArea.getRight() - 72, y, 72, 26);

    // pad editor
    const int ex = padArea.getRight() + 28 + 14, ew = getWidth() - ex - 28;
    y = 80;
    padTitle.setBounds (ex, y, ew - 90, 26);
    playButton.setBounds (ex + ew - 80, y, 80, 28);
    y += 38;
    wave.setBounds (ex, y, ew, 170);
    y += 180;
    urlBox.setBounds (ex, y, ew - 110, 30);
    urlButton.setBounds (ex + ew - 102, y, 102, 30);
    y += 40;
    openButton.setBounds (ex, y, 100, 28);
    chopBox.setBounds (ex + 108, y, 136, 28);
    chopButton.setBounds (ex + 250, y, 130, 28);
    clearButton.setBounds (ex + ew - 94, y, 94, 28);
    y += 42;
    const int kw = 84;
    level.label.setBounds (ex, y, kw, 14);
    level.slider.setBounds (ex, y + 14, kw, 80);
    tune.label.setBounds (ex + kw + 8, y, kw, 14);
    tune.slider.setBounds (ex + kw + 8, y + 14, kw, 80);
    pan.label.setBounds (ex + 2 * (kw + 8), y, kw, 14);
    pan.slider.setBounds (ex + 2 * (kw + 8), y + 14, kw, 80);
    const int ox = ex + 3 * (kw + 8) + 10;
    modeLabel.setBounds (ox, y + 6, 46, 26);
    modeBox.setBounds (ox + 48, y + 6, ex + ew - ox - 48, 26);
    chokeLabel.setBounds (ox, y + 40, 46, 26);
    chokeBox.setBounds (ox + 48, y + 40, ex + ew - ox - 48, 26);
    reverseToggle.setBounds (ox, y + 74, 100, 24);
    y += 104;
    noteLabel.setBounds (ex, y, 200, 28);
    learnButton.setBounds (ex + 204, y, 110, 28);
    exportButton.setBounds (ex + ew - 120, y, 120, 28);
    y += 40;
    voxHeading.setBounds (ex, y, 260, 20);
    y += 22;
    voiceBox.setBounds (ex, y, ew - 168, 28);
    voxRescan.setBounds (ex + ew - 160, y, 76, 28);
    voxFolder.setBounds (ex + ew - 78, y, 78, 28);
    y += 36;
    voxPitchLabel.setBounds (ex, y, 40, 28);
    voxPitch.setBounds (ex + 42, y, ew - 42 - 128, 28);
    voxButton.setBounds (ex + ew - 116, y, 116, 28);

    // master strip
    const int my = padArea.getBottom() + 112 + 12 + 14;
    int x = 34;
    auto section = [&] (juce::ToggleButton& t, std::initializer_list<Knob*> knobs)
    {
        t.setBounds (x, my - 2, 140, 22);
        int kx = x;
        for (auto* k : knobs)
        {
            k->label.setBounds (kx, my + 24, 64, 14);
            k->slider.setBounds (kx, my + 38, 64, 74);
            kx += 66;
        }
        x = juce::jmax (kx, t.getRight() - 40) + 22;
    };
    section (ntOn, { &ntIn, &ntDrive, &ntMix, &ntOut });
    ntOn.setSize (112, 22);
    ampButton.setBounds (ntOn.getX() + 116, my - 3, 88, 22);
    ampLabel.setBounds (ntOn.getX() + 208, my - 3, 104, 22);
    x = juce::jmax (x, ampLabel.getRight() + 22);
    section (glueOn, { &glueThresh, &glueRatio, &glueAttack, &glueRelease, &glueMakeup, &glueMix });
    section (tapeOn, { &tapeDrive, &tapeWarmth });
    section (limOn, { &limCeiling, &limRelease });
    master.label.setBounds (x, my + 24, 64, 14);
    master.slider.setBounds (x, my + 38, 64, 74);

    status.setBounds (16, getHeight() - 34, getWidth() - 32, 26);
}
