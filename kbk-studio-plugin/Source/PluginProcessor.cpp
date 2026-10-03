#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace
{
const juce::StringArray masterIds { "master", "glueOn", "glueThresh", "glueRatio", "glueAttack", "glueRelease", "glueMakeup",
                                    "glueMix", "tapeOn", "tapeDrive", "tapeWarmth", "limOn", "limCeiling", "limRelease" };

std::unique_ptr<juce::AudioParameterFloat> knob (const juce::String& id, const juce::String& name, float lo, float hi,
                                                 float def, const juce::String& unit = {}, float skewCentre = 0.0f)
{
    juce::NormalisableRange<float> r (lo, hi);
    if (skewCentre > 0.0f)
        r.setSkewForCentre (skewCentre);
    // readable values in the knobs and in Logic's automation: "-12.0 dB", "2.0:1", "40%"
    const bool percent = unit.isEmpty() && lo == 0.0f && hi == 1.0f;
    auto toText = [percent, unit] (float v, int)
    {
        if (percent)
            return juce::String (juce::roundToInt (v * 100.0f)) + "%";
        return juce::String (v, std::abs (v) >= 100.0f ? 0 : 1) + (unit == ":1" ? unit : unit.isNotEmpty() ? " " + unit : juce::String());
    };
    auto fromText = [percent] (const juce::String& t) { return percent ? t.getFloatValue() / 100.0f : t.getFloatValue(); };
    return std::make_unique<juce::AudioParameterFloat> (juce::ParameterID { id, 1 }, name, r, def,
                                                        juce::AudioParameterFloatAttributes()
                                                            .withLabel (unit)
                                                            .withStringFromValueFunction (toText)
                                                            .withValueFromStringFunction (fromText));
}

std::unique_ptr<juce::AudioParameterBool> toggle (const juce::String& id, const juce::String& name, bool def)
{
    return std::make_unique<juce::AudioParameterBool> (juce::ParameterID { id, 1 }, name, def);
}

// Pad audio is kept inside the Logic project as FLAC, so a project reopens
// with its chops even if the original file is gone.
// The writer takes the stream when it opens; otherwise the stream is freed here.
std::unique_ptr<juce::AudioFormatWriter> makeWriter (juce::AudioFormat& format, std::unique_ptr<juce::OutputStream> stream,
                                                     double rate, int channels, int bits)
{
    return format.createWriterFor (stream, juce::AudioFormatWriterOptions {}.withSampleRate (rate).withNumChannels (channels).withBitsPerSample (bits));
}

juce::MemoryBlock toFlac (const juce::AudioBuffer<float>& audio, double rate)
{
    juce::MemoryBlock mb;
    juce::FlacAudioFormat flac;
    auto w = makeWriter (flac, std::make_unique<juce::MemoryOutputStream> (mb, false), juce::jlimit (8000.0, 192000.0, rate), audio.getNumChannels(), 24);
    if (w == nullptr)
        return {};
    w->writeFromAudioSampleBuffer (audio, 0, audio.getNumSamples());
    w.reset(); // flushes into mb
    return mb;
}

std::shared_ptr<juce::AudioBuffer<float>> fromFlac (const juce::MemoryBlock& mb, double& rate)
{
    juce::FlacAudioFormat flac;
    std::unique_ptr<juce::AudioFormatReader> r (flac.createReaderFor (new juce::MemoryInputStream (mb, false), true));
    if (r == nullptr || r->lengthInSamples <= 0)
        return nullptr;
    auto buf = std::make_shared<juce::AudioBuffer<float>> ((int) r->numChannels, (int) r->lengthInSamples);
    r->read (buf.get(), 0, (int) r->lengthInSamples, 0, true, true);
    rate = r->sampleRate;
    return buf;
}
} // namespace

juce::AudioProcessorValueTreeState::ParameterLayout KbkStudioProcessor::createLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout l;
    l.add (knob ("master", "Master", -24.0f, 6.0f, 0.0f, "dB"));
    l.add (toggle ("glueOn", "Glue On", true));
    l.add (knob ("glueThresh", "Glue Threshold", -40.0f, 0.0f, -12.0f, "dB"));
    l.add (knob ("glueRatio", "Glue Ratio", 1.0f, 10.0f, 2.0f, ":1", 3.0f));
    l.add (knob ("glueAttack", "Glue Attack", 0.1f, 100.0f, 10.0f, "ms", 10.0f));
    l.add (knob ("glueRelease", "Glue Release", 10.0f, 1000.0f, 120.0f, "ms", 150.0f));
    l.add (knob ("glueMakeup", "Glue Makeup", 0.0f, 18.0f, 0.0f, "dB"));
    l.add (knob ("glueMix", "Glue Mix", 0.0f, 1.0f, 1.0f));
    l.add (toggle ("tapeOn", "Tape On", false));
    l.add (knob ("tapeDrive", "Tape Drive", 0.0f, 1.0f, 0.3f));
    l.add (knob ("tapeWarmth", "Tape Warmth", 0.0f, 1.0f, 0.4f));
    l.add (toggle ("limOn", "Limiter On", true));
    l.add (knob ("limCeiling", "Limiter Ceiling", -12.0f, 0.0f, -0.3f, "dB"));
    l.add (knob ("limRelease", "Limiter Release", 10.0f, 1000.0f, 100.0f, "ms", 150.0f));
    l.add (std::make_unique<juce::AudioParameterChoice> (juce::ParameterID { "keyMode", 1 }, "Keyboard",
                                                         juce::StringArray { "Pads", "Keys", "Split" }, 0));
    l.add (std::make_unique<juce::AudioParameterInt> (juce::ParameterID { "baseNote", 1 }, "Pad 1 Note", 0, 112, 36));
    l.add (toggle ("velocity", "Velocity", true));
    return l;
}

KbkStudioProcessor::KbkStudioProcessor()
    : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      params (*this, nullptr, "Params", createLayout())
{
    for (auto& id : masterIds)
        params.addParameterListener (id, this);
    for (auto id : { "keyMode", "baseNote", "velocity" })
        params.addParameterListener (id, this);
    pushMasterSettings();
}

KbkStudioProcessor::~KbkStudioProcessor()
{
    *alive = false;
    loader.cancelled = true;
    pool.removeAllJobs (true, 5000);
}

void KbkStudioProcessor::onMessageThread (std::function<void()> fn)
{
    juce::MessageManager::callAsync ([flag = alive, fn = std::move (fn)] { if (flag->load()) fn(); });
}

bool KbkStudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto out = layouts.getMainOutputChannelSet();
    return out == juce::AudioChannelSet::stereo() || out == juce::AudioChannelSet::mono();
}

void KbkStudioProcessor::parameterChanged (const juce::String& id, float)
{
    if (id == "keyMode")
        sampler.keyMode = (int) params.getRawParameterValue ("keyMode")->load();
    else if (id == "velocity")
        sampler.velocitySensitive = params.getRawParameterValue ("velocity")->load() > 0.5f;
    else if (id == "baseNote")
        sampler.setBaseNote ((int) params.getRawParameterValue ("baseNote")->load());
    else
        masterDirty = true;
}

void KbkStudioProcessor::pushMasterSettings()
{
    auto v = [this] (const char* id) { return params.getRawParameterValue (id)->load(); };
    kbk::MasterSettings m;
    m.masterDb = v ("master");
    m.glueOn = v ("glueOn") > 0.5f;
    m.glueThreshDb = v ("glueThresh");
    m.glueRatio = v ("glueRatio");
    m.glueAttackMs = v ("glueAttack");
    m.glueReleaseMs = v ("glueRelease");
    m.glueMakeupDb = v ("glueMakeup");
    m.glueMix = v ("glueMix");
    m.tapeOn = v ("tapeOn") > 0.5f;
    m.tapeDrive = v ("tapeDrive");
    m.tapeWarmth = v ("tapeWarmth");
    m.limiterOn = v ("limOn") > 0.5f;
    m.limiterCeilingDb = v ("limCeiling");
    m.limiterReleaseMs = v ("limRelease");
    sampler.setMaster (m);
    sampler.keyMode = (int) v ("keyMode");
    sampler.velocitySensitive = v ("velocity") > 0.5f;
}

void KbkStudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    sampler.prepare (sampleRate, samplesPerBlock);
    pushMasterSettings();
}

void KbkStudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    juce::ScopedNoDenormals noDenormals;
    if (masterDirty.exchange (false))
        pushMasterSettings();
    sampler.render (buffer, midi);
}

// ---- loading ------------------------------------------------------------------

void KbkStudioProcessor::setStatus (const juce::String& text, bool error)
{
    auto apply = [this, text, error]
    {
        statusText = text;
        statusError = error;
        sendChangeMessage();
    };
    if (juce::MessageManager::getInstance()->isThisTheMessageThread())
        apply();
    else
        onMessageThread (apply);
}

void KbkStudioProcessor::loadFile (const juce::File& file, int pad)
{
    busy = true;
    setStatus ("Loading " + file.getFileName() + "...");
    pool.addJob ([this, file, pad]
                 {
                     auto loaded = std::make_shared<kbk::LoadedAudio> (loader.loadFile (file));
                     onMessageThread ([this, loaded, pad] { place (std::move (*loaded), pad); });
                 });
}

void KbkStudioProcessor::loadUrl (const juce::String& url, int pad)
{
    busy = true;
    setStatus ("Reading link...");
    pool.addJob ([this, url, pad]
                 {
                     auto loaded = std::make_shared<kbk::LoadedAudio> (loader.loadUrl (url, [this] (const juce::String& s) { setStatus (s); }));
                     onMessageThread ([this, loaded, pad] { place (std::move (*loaded), pad); });
                 });
}

void KbkStudioProcessor::place (kbk::LoadedAudio loaded, int pad)
{
    busy = false;
    if (! loaded.ok())
    {
        setStatus (loaded.error, true);
        return;
    }
    if (autoChop && chopToPads (loaded.audio, loaded.sampleRate, loaded.name, ChopHow::Smart))
        return;
    kbk::Pad p = sampler.getPad (pad);
    p.audio = std::make_shared<const juce::AudioBuffer<float>> (std::move (loaded.audio));
    p.sourceRate = loaded.sampleRate;
    p.name = loaded.name;
    p.start = 0.0f;
    p.end = 1.0f;
    p.reverse = false;
    sampler.setPad (pad, p);
    sampler.selectedPad = pad;
    setStatus ("Pad " + juce::String (pad + 1) + ": " + loaded.name + " (" + juce::String (p.seconds(), 2) + " s)");
}

bool KbkStudioProcessor::chopToPads (const juce::AudioBuffer<float>& audio, double rate, const juce::String& name, ChopHow how)
{
    const double dur = audio.getNumSamples() / rate;
    std::vector<kbk::Range> ranges;
    juce::String how_;
    if (how == ChopHow::Smart)
    {
        auto r = kbk::autoChop (audio, rate);
        if (r.kind == kbk::ChopResult::Kind::OneShot)
            return false;
        ranges = r.ranges;
        how_ = r.kind == kbk::ChopResult::Kind::Song
                   ? " (" + juce::String (juce::roundToInt (r.bpm)) + " BPM, one bar each, picked from across the whole song)"
                   : " at the hits";
    }
    else if (how == ChopHow::Hits)
    {
        ranges = kbk::chopAtHits (audio, rate);
        how_ = " at the hits";
    }
    else
    {
        const int n = how == ChopHow::Equal4 ? 4 : how == ChopHow::Equal8 ? 8 : 16;
        ranges = kbk::chopEqual (dur, n);
        how_ = " (equal slices)";
    }

    undoKit.clear();
    for (int i = 0; i < kbk::numPads; ++i)
        undoKit.push_back (sampler.getPad (i));
    sampler.stopAll();
    for (int i = 0; i < kbk::numPads; ++i)
    {
        kbk::Pad p = sampler.getPad (i);
        if (i < (int) ranges.size())
        {
            p.audio = std::make_shared<const juce::AudioBuffer<float>> (kbk::cut (audio, rate, ranges[(size_t) i]));
            p.sourceRate = rate;
            p.name = name + " " + juce::String (i + 1);
            p.start = 0.0f;
            p.end = 1.0f;
            p.reverse = false;
            p.tune = 0.0f;
            p.gain = 0.8f;
            p.mode = kbk::PlayMode::OneShot;
            p.choke = chopCut ? 4 : 0;
        }
        else
            p = kbk::Pad();
        sampler.setPad (i, p);
    }
    sampler.selectedPad = 0;
    setStatus ("Chopped \"" + name + "\" into " + juce::String ((int) ranges.size()) + " pads" + how_ + ". Play them from your keyboard.");
    return true;
}

void KbkStudioProcessor::chopPad (int pad, ChopHow how)
{
    const auto p = sampler.getPad (pad);
    if (! p.loaded())
    {
        setStatus ("Load a song or loop on this pad first.", true);
        return;
    }
    if (how == ChopHow::Smart && p.seconds() <= 1.5)
        how = ChopHow::Hits;
    auto audio = p.audio; // keep it alive while the pads are replaced
    chopToPads (*audio, p.sourceRate, p.name, how);
}

void KbkStudioProcessor::undoChop()
{
    if (undoKit.empty())
        return;
    sampler.stopAll();
    for (int i = 0; i < kbk::numPads; ++i)
        sampler.setPad (i, undoKit[(size_t) i]);
    undoKit.clear();
    setStatus ("Pads put back the way they were.");
}

void KbkStudioProcessor::clearPad (int pad)
{
    sampler.stopPad (pad);
    sampler.setPad (pad, kbk::Pad());
    sendChangeMessage();
}

void KbkStudioProcessor::updatePad (int pad, const std::function<void (kbk::Pad&)>& change)
{
    auto p = sampler.getPad (pad);
    change (p);
    sampler.setPad (pad, p);
}

bool KbkStudioProcessor::exportPad (int pad, const juce::File& file)
{
    const auto p = sampler.getPad (pad);
    if (! p.loaded())
        return false;
    const int n = p.audio->getNumSamples();
    const int a = (int) (juce::jmin (p.start, p.end) * n), b = (int) (juce::jmax (p.start, p.end) * n);
    juce::AudioBuffer<float> part (p.audio->getNumChannels(), juce::jmax (1, b - a));
    for (int c = 0; c < part.getNumChannels(); ++c)
        part.copyFrom (c, 0, *p.audio, c, a, juce::jmax (1, b - a));
    if (p.reverse)
        part.reverse (0, part.getNumSamples());
    file.deleteFile();
    std::unique_ptr<juce::OutputStream> os = file.createOutputStream();
    if (os == nullptr)
        return false;
    juce::WavAudioFormat wav;
    auto w = makeWriter (wav, std::move (os), p.sourceRate, part.getNumChannels(), 24);
    if (w == nullptr)
        return false;
    return w->writeFromAudioSampleBuffer (part, 0, part.getNumSamples());
}

void KbkStudioProcessor::checkHelper()
{
    pool.addJob ([this]
                 {
                     helperState = loader.helperOnline() ? 1 : 0;
                     setStatus (statusText, statusError);
                 });
}

// ---- state ------------------------------------------------------------------------

void KbkStudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    juce::ValueTree root ("KBKStudio");
    root.setProperty ("version", 1, nullptr);
    root.setProperty ("autoChop", autoChop, nullptr);
    root.setProperty ("chopCut", chopCut, nullptr);
    root.setProperty ("selected", sampler.selectedPad.load(), nullptr);
    root.appendChild (params.copyState(), nullptr);
    juce::ValueTree padsTree ("Pads");
    const auto notes = sampler.getPadNotes();
    for (int i = 0; i < kbk::numPads; ++i)
    {
        const auto p = sampler.getPad (i);
        juce::ValueTree t ("Pad");
        t.setProperty ("index", i, nullptr);
        t.setProperty ("note", notes[(size_t) i], nullptr);
        t.setProperty ("name", p.name, nullptr);
        t.setProperty ("gain", p.gain, nullptr);
        t.setProperty ("tune", p.tune, nullptr);
        t.setProperty ("pan", p.pan, nullptr);
        t.setProperty ("start", p.start, nullptr);
        t.setProperty ("end", p.end, nullptr);
        t.setProperty ("mode", (int) p.mode, nullptr);
        t.setProperty ("reverse", p.reverse, nullptr);
        t.setProperty ("choke", p.choke, nullptr);
        if (p.loaded())
        {
            t.setProperty ("rate", p.sourceRate, nullptr);
            t.setProperty ("flac", juce::var (toFlac (*p.audio, p.sourceRate)), nullptr);
        }
        padsTree.appendChild (t, nullptr);
    }
    root.appendChild (padsTree, nullptr);
    juce::MemoryOutputStream mo (destData, false);
    root.writeToStream (mo);
}

void KbkStudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    auto root = juce::ValueTree::readFromData (data, (size_t) sizeInBytes);
    if (! root.hasType ("KBKStudio"))
        return;
    autoChop = root.getProperty ("autoChop", true);
    chopCut = root.getProperty ("chopCut", true);
    if (auto ps = root.getChildWithName (params.state.getType()); ps.isValid())
        params.replaceState (ps);
    pushMasterSettings();
    auto notes = sampler.getPadNotes();
    if (auto padsTree = root.getChildWithName ("Pads"); padsTree.isValid())
    {
        for (auto t : padsTree)
        {
            const int i = t.getProperty ("index", -1);
            if (i < 0 || i >= kbk::numPads)
                continue;
            kbk::Pad p;
            p.name = t.getProperty ("name").toString();
            p.gain = t.getProperty ("gain", 0.8f);
            p.tune = t.getProperty ("tune", 0.0f);
            p.pan = t.getProperty ("pan", 0.0f);
            p.start = t.getProperty ("start", 0.0f);
            p.end = t.getProperty ("end", 1.0f);
            p.mode = (kbk::PlayMode) (int) t.getProperty ("mode", 0);
            p.reverse = t.getProperty ("reverse", false);
            p.choke = t.getProperty ("choke", 0);
            notes[(size_t) i] = t.getProperty ("note", 36 + i);
            if (auto* mb = t.getProperty ("flac").getBinaryData())
            {
                double rate = 44100.0;
                if (auto buf = fromFlac (*mb, rate))
                {
                    p.audio = buf;
                    p.sourceRate = rate;
                }
            }
            sampler.setPad (i, p);
        }
    }
    sampler.setPadNotes (notes);
    sampler.selectedPad = juce::jlimit (0, kbk::numPads - 1, (int) root.getProperty ("selected", 0));
    sendChangeMessage();
}

juce::AudioProcessorEditor* KbkStudioProcessor::createEditor()
{
    return new KbkStudioEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new KbkStudioProcessor();
}
