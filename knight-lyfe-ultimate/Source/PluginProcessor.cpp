#include "PluginProcessor.h"
#include "PluginEditor.h"

#if JucePlugin_Build_Standalone
 #include <juce_audio_plugin_client/Standalone/juce_StandaloneFilterWindow.h>
#endif

#include <array>

// Output 1 is the main mix. Outputs 2-16 are drum outputs for Logic's "Multi-Output"
// version: turn them on and each drum gets its own mixer channel. The first six carry
// the drum groups unless the Kit Rack routes a drum somewhere else.
juce::AudioProcessor::BusesProperties KnightLyfeProcessor::makeBuses()
{
    auto buses = BusesProperties();
    // The standalone app listens to the mic or an audio interface for lessons (guitar,
    // bass, voice). The plug-ins don't take an input, so Logic sees a plain instrument.
    if (juce::PluginHostType::getPluginLoadedAs() == wrapperType_Standalone)
        buses = buses.withInput ("Input", juce::AudioChannelSet::mono(), true);
    buses = buses.withOutput ("Main", juce::AudioChannelSet::stereo(), true);
    for (const auto* name : { "Kick", "Snare", "Hi-Hat", "Toms", "Cymbals", "Percussion" })
        buses = buses.withOutput (name, juce::AudioChannelSet::stereo(), false);
    for (int i = knightlyfe::numDrumGroups + 1; i <= knightlyfe::numDrumOutputs; ++i)
        buses = buses.withOutput ("Drums " + juce::String (i), juce::AudioChannelSet::stereo(), false);
    return buses;
}

KnightLyfeProcessor::KnightLyfeProcessor()
    : AudioProcessor (makeBuses()),
      parameters (*this, nullptr, "KnightLyfe", createParameters())
{
    masterParam = parameters.getRawParameterValue ("master");

    // Your Kit Rack (tuning and samples) lives outside the project, like a sound library.
   #if JUCE_MAC
    const auto support = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory).getChildFile ("Application Support");
   #else
    const auto support = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory);
   #endif
    engine.setKitFolder (support.getChildFile ("Knight Lyfe").getChildFile ("Kit"));
    reverbParam = parameters.getRawParameterValue ("reverb");
    drumTrackParam = parameters.getRawParameterValue ("drumTrack");

    // On a Mac, JUCE's standalone app starts with every MIDI input switched off, so the
    // keyboard and e-kit stay silent until they're ticked in Options. Turn them all on.
    if (wrapperType == wrapperType_Standalone)
    {
        juce::MessageManager::callAsync ([this] {
            openAllMidiInputs();
           #if JucePlugin_Build_Standalone
            // The input only feeds the lesson listener and is never played back, so
            // there's no feedback loop: skip JUCE's "Audio input is muted" warning bar.
            if (auto* holder = juce::StandalonePluginHolder::getInstance())
                holder->getMuteInputValue().setValue (false);
           #endif
        });
        midiDevicesChanged = juce::MidiDeviceListConnection::make ([this] { openAllMidiInputs(); });
    }
}

void KnightLyfeProcessor::openAllMidiInputs()
{
   #if JucePlugin_Build_Standalone
    if (auto* holder = juce::StandalonePluginHolder::getInstance())
        for (const auto& device : juce::MidiInput::getAvailableDevices())
            if (! holder->deviceManager.isMidiInputDeviceEnabled (device.identifier))
                holder->deviceManager.setMidiInputDeviceEnabled (device.identifier, true);
   #endif
}

juce::AudioProcessorValueTreeState::ParameterLayout KnightLyfeProcessor::createParameters()
{
    using namespace juce;
    AudioProcessorValueTreeState::ParameterLayout layout;
    layout.add (std::make_unique<AudioParameterFloat> (ParameterID { "master", 1 }, "Volume",
                                                       NormalisableRange<float> (0.0f, 1.5f), 0.9f));
    layout.add (std::make_unique<AudioParameterFloat> (ParameterID { "reverb", 1 }, "Room",
                                                       NormalisableRange<float> (0.0f, 1.0f), 0.2f));
    // For a Logic drum track (or an e-kit that isn't on channel 10): every note plays drums.
    layout.add (std::make_unique<AudioParameterBool> (ParameterID { "drumTrack", 1 }, "Drum Track", false));
    return layout;
}

bool KnightLyfeProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto in = layouts.getMainInputChannelSet();
    if (! in.isDisabled() && in != juce::AudioChannelSet::mono() && in != juce::AudioChannelSet::stereo())
        return false;
    const auto out = layouts.getMainOutputChannelSet();
    if (out != juce::AudioChannelSet::stereo() && out != juce::AudioChannelSet::mono())
        return false;
    for (int i = 1; i < layouts.outputBuses.size(); ++i) // drum outputs: off or stereo
    {
        const auto& set = layouts.outputBuses.getReference (i);
        if (! set.isDisabled() && set != juce::AudioChannelSet::stereo())
            return false;
    }
    return true;
}

void KnightLyfeProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    engine.prepare (sampleRate, samplesPerBlock);
    listener.prepare (sampleRate);
    monoScratch.setSize (2, samplesPerBlock);
    reverb.prepare ({ sampleRate, (juce::uint32) samplesPerBlock, 2 });
    limiter.prepare ({ sampleRate, (juce::uint32) samplesPerBlock, 2 });
    limiter.setThreshold (-1.0f);
    limiter.setRelease (120.0f);
    masterGain.reset (sampleRate, 0.05);
    masterGain.setCurrentAndTargetValue (masterParam->load());
}

void KnightLyfeProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi)
{
    juce::ScopedNoDenormals noDenormals;
    const int numSamples = buffer.getNumSamples();

    // The input (standalone app): heard by lessons, never played back. Read it before
    // rendering, since the output shares these channels.
    if (getBusCount (true) > 0 && listener.isActive())
    {
        const auto input = getBusBuffer (buffer, true, 0);
        listener.push (input, numSamples);
    }

    // Main output (bus 0) and any drum outputs Logic has switched on.
    auto main = getBusBuffer (buffer, false, 0);
    std::array<juce::AudioBuffer<float>, knightlyfe::numDrumOutputs> drumBuses;
    knightlyfe::DrumOutputs drumOuts {};
    bool anyDrumOut = false;
    for (int g = 0; g < knightlyfe::numDrumOutputs; ++g)
    {
        const int bus = g + 1;
        if (bus < getBusCount (false) && getBus (false, bus)->isEnabled() && getBus (false, bus)->getNumberOfChannels() > 0)
        {
            drumBuses[(size_t) g] = getBusBuffer (buffer, false, bus);
            drumOuts[(size_t) g] = &drumBuses[(size_t) g];
            anyDrumOut = true;
        }
    }

    // The engine renders in stereo; fold to mono if the track is mono.
    auto& stereo = monoScratch;
    juce::AudioBuffer<float>* target = &main;
    if (main.getNumChannels() < 2)
    {
        stereo.setSize (2, numSamples, false, false, true); // no allocation within the prepared size
        target = &stereo;
    }

    // Logic's tempo and playhead, so songs and grooves can play in time with it.
    if (wrapperType != wrapperType_Standalone)
        if (auto* hostPlayHead = getPlayHead())
            if (const auto pos = hostPlayHead->getPosition())
            {
                knightlyfe::SoundEngine::HostPosition hp;
                hp.valid = true;
                hp.playing = pos->getIsPlaying();
                hp.bpm = juce::jlimit (20.0, 999.0, pos->getBpm().orFallback (120.0));
                hp.ppq = pos->getPpqPosition().orFallback (0.0);
                if (const auto sig = pos->getTimeSignature())
                {
                    hp.num = sig->numerator;
                    hp.den = sig->denominator;
                }
                hp.wallMs = engine.clockMs();
                engine.setHostPosition (hp);
            }

    engine.setHostDrumsOnAllChannels (drumTrackParam->load() >= 0.5f);
    engine.process (*target, midi, anyDrumOut ? &drumOuts : nullptr);

    const float room = reverbParam->load();
    juce::dsp::Reverb::Parameters p;
    p.roomSize = 0.55f + 0.3f * room;
    p.damping = 0.45f;
    p.width = 1.0f;
    p.wetLevel = 0.35f * room;
    p.dryLevel = 1.0f - 0.25f * room;
    reverb.setParameters (p);
    if (room > 0.001f && target->getNumChannels() >= 2)
    {
        juce::dsp::AudioBlock<float> block (*target);
        auto stereoBlock = block.getSubsetChannelBlock (0, 2);
        reverb.process (juce::dsp::ProcessContextReplacing<float> (stereoBlock));
    }

    masterGain.setTargetValue (masterParam->load());
    for (auto* out : drumOuts) // drum outputs follow the volume too (Logic's own effects do the rest)
        if (out != nullptr)
            out->applyGain (masterGain.getCurrentValue());
    masterGain.applyGain (*target, target->getNumSamples());

    if (target->getNumChannels() >= 2)
    {
        juce::dsp::AudioBlock<float> out (*target);
        auto outStereo = out.getSubsetChannelBlock (0, 2);
        limiter.process (juce::dsp::ProcessContextReplacing<float> (outStereo));
    }

    if (target != &main)
    {
        main.copyFrom (0, 0, stereo, 0, 0, numSamples);
        main.addFrom (0, 0, stereo, 1, 0, numSamples);
        main.applyGain (0.5f);
    }

    midi.clear(); // an instrument: nothing goes out
}

void KnightLyfeProcessor::setListening (bool on, bool bassRange)
{
    listener.setBassRange (bassRange);
    listener.setActive (on);
   #if JucePlugin_Build_Standalone
    // JUCE's standalone app mutes its input to avoid feedback; this processor never
    // plays the input back, so it is safe to let lessons hear it.
    if (on && wrapperType == wrapperType_Standalone)
        if (auto* holder = juce::StandalonePluginHolder::getInstance())
            holder->getMuteInputValue().setValue (false);
   #endif
}

void KnightLyfeProcessor::handleInterfaceBatch (const juce::var& v)
{
    engine.handleInterfaceBatch (v);
}

void KnightLyfeProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    if (auto xml = parameters.copyState().createXml())
        copyXmlToBinary (*xml, destData);
}

void KnightLyfeProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
        if (xml->hasTagName (parameters.state.getType()))
            parameters.replaceState (juce::ValueTree::fromXml (*xml));
}

juce::AudioProcessorEditor* KnightLyfeProcessor::createEditor()
{
    return new KnightLyfeEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new KnightLyfeProcessor();
}
