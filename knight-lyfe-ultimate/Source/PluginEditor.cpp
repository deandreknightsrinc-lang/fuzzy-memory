#include "PluginEditor.h"

KnightLyfeEditor::KnightLyfeEditor (KnightLyfeProcessor& p)
    : AudioProcessorEditor (p),
      processor (p),
      browser (makeOptions())
{
    addAndMakeVisible (browser);
    browser.goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    setResizable (true, true);
    setResizeLimits (820, 520, 3840, 2160);
    setSize (1280, 800);

    hostMessages.reserve (2048);
    startTimerHz (60);
}

KnightLyfeEditor::~KnightLyfeEditor()
{
    stopTimer();
}

juce::WebBrowserComponent::Options KnightLyfeEditor::makeOptions()
{
    using Options = juce::WebBrowserComponent::Options;
    return Options {}
        .withBackend (Options::Backend::webview2)
        .withWinWebView2Options (Options::WinWebView2 {}.withUserDataFolder (
            juce::File::getSpecialLocation (juce::File::tempDirectory).getChildFile ("KnightLyfeUltimate")))
        .withNativeIntegrationEnabled()
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withResourceProvider ([this] (const juce::String& url) { return assets.get (url); })
        .withEventListener ("kk", [this] (const juce::var& v) { processor.handleInterfaceBatch (v); })
        .withEventListener ("kkSave", [this] (const juce::var& v) { saveFile (v); });
}

void KnightLyfeEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour (0xff0e0f13));
}

void KnightLyfeEditor::resized()
{
    browser.setBounds (getLocalBounds());
}

void KnightLyfeEditor::timerCallback()
{
    // Forward MIDI the host received so the keyboard, chords and learn mode follow it.
    hostMessages.clear();
    if (processor.getEngine().drainHostMidi (hostMessages) == 0)
        return;

    juce::Array<juce::var> list;
    for (const auto& m : hostMessages)
        list.add (juce::Array<juce::var> { (int) m.status, (int) m.data1, (int) m.data2 });
    browser.emitEventIfBrowserIsVisible ("hostMidi", list);
}

void KnightLyfeEditor::saveFile (const juce::var& request)
{
    const auto name = request.getProperty ("name", "Knight Lyfe file").toString();
    auto data = std::make_shared<juce::MemoryBlock>();
    if (! data->fromBase64Encoding (request.getProperty ("data", "").toString()))
        return;

    chooser = std::make_unique<juce::FileChooser> (
        "Save " + name,
        juce::File::getSpecialLocation (juce::File::userDocumentsDirectory).getChildFile (name),
        "*." + name.fromLastOccurrenceOf (".", false, false));

    chooser->launchAsync (juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::warnAboutOverwriting,
                          [data] (const juce::FileChooser& fc) {
                              const auto file = fc.getResult();
                              if (file != juce::File())
                                  file.replaceWithData (data->getData(), data->getSize());
                          });
}
