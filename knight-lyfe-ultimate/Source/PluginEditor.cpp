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
        .withEventListener ("kkSave", [this] (const juce::var& v) { saveFile (v); })
        .withEventListener ("kkHostInfo", [this] (const juce::var&) {
            auto* info = new juce::DynamicObject();
            info->setProperty ("canListen", processor.getBusCount (true) > 0); // the standalone app has an input
            browser.emitEventIfBrowserIsVisible ("hostInfo", juce::var (info));
        })
        .withEventListener ("kkListen", [this] (const juce::var& v) {
            processor.setListening ((bool) v.getProperty ("on", false), v.getProperty ("range", "") == juce::var ("bass"));
        })
        .withEventListener ("kkKitQuery", [this] (const juce::var&) {
            browser.emitEventIfBrowserIsVisible ("kkKitState", processor.getEngine().getKitState());
        })
        .withEventListener ("kkSample", [this] (const juce::var& v) {
            const bool ok = processor.getEngine().handleDrumSample (v);
            auto* reply = new juce::DynamicObject();
            reply->setProperty ("note", v.getProperty ("note", -1));
            reply->setProperty ("ok", ok);
            browser.emitEventIfBrowserIsVisible ("kkSampleLoaded", juce::var (reply));
        });
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
    sendTransport();
    sendListening();

    // Forward MIDI the host received so the keyboard, chords and learn mode follow it.
    hostMessages.clear();
    if (processor.getEngine().drainHostMidi (hostMessages) == 0)
        return;

    juce::Array<juce::var> list;
    for (const auto& m : hostMessages)
        list.add (juce::Array<juce::var> { (int) m.status, (int) m.data1, (int) m.data2 });
    browser.emitEventIfBrowserIsVisible ("hostMidi", list);
}

void KnightLyfeEditor::sendTransport()
{
    // Logic's tempo and playhead: every frame while it plays, and on any change
    // (or twice a second) while it is stopped. "age" is how long ago (ms) the
    // position was measured, so the page can place it on its own clock.
    auto& engine = processor.getEngine();
    const auto pos = engine.getHostPosition();
    if (! pos.valid)
        return;

    const bool changed = pos.playing != lastTransport.playing || ! juce::exactlyEqual (pos.bpm, lastTransport.bpm)
                         || pos.num != lastTransport.num || pos.den != lastTransport.den
                         || (! pos.playing && ! juce::exactlyEqual (pos.ppq, lastTransport.ppq));
    if (! pos.playing && ! changed && ++idleTransportTicks < 30)
        return;
    idleTransportTicks = 0;
    lastTransport = pos;

    auto* obj = new juce::DynamicObject();
    obj->setProperty ("playing", pos.playing);
    obj->setProperty ("bpm", pos.bpm);
    obj->setProperty ("ppq", pos.ppq);
    obj->setProperty ("num", pos.num);
    obj->setProperty ("den", pos.den);
    obj->setProperty ("age", juce::jmax (0.0, engine.clockMs() - pos.wallMs));
    browser.emitEventIfBrowserIsVisible ("hostTransport", juce::var (obj));
}

void KnightLyfeEditor::saveFile (const juce::var& request)
{
    const auto name = request.getProperty ("name", "Knight Lyfe file").toString();
    auto data = std::make_shared<juce::MemoryBlock>();
    if (! knightlyfe::SoundEngine::decodeBase64 (request.getProperty ("data", "").toString(), *data))
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

void KnightLyfeEditor::sendListening()
{
    // About 30 times a second while a lesson listens: { note | null, rms, sr, fftSize,
    // db: [dB per bin up to 1500 Hz] } for HostListener in knight-keys/js/host.js.
    auto& listener = processor.getListener();
    if (! listener.isActive() || ++listenTick % 2 != 0)
        return;
    listener.analyse (heard);
    juce::Array<juce::var> db;
    db.ensureStorageAllocated ((int) heard.spectrumDb.size());
    for (const auto v : heard.spectrumDb)
        db.add (std::round (v * 10.0f) / 10.0f);
    auto* obj = new juce::DynamicObject();
    obj->setProperty ("note", heard.hasPitch ? juce::var (heard.note) : juce::var());
    obj->setProperty ("rms", heard.rms);
    obj->setProperty ("sr", heard.sampleRate);
    obj->setProperty ("fftSize", heard.fftSize);
    obj->setProperty ("db", db);
    browser.emitEventIfBrowserIsVisible ("hostListen", juce::var (obj));
}
