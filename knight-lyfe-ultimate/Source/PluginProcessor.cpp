#include "PluginProcessor.h"
#include "PluginEditor.h"

KnightLyfeProcessor::KnightLyfeProcessor()
    : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      parameters (*this, nullptr, "KnightLyfe", createParameters())
{
    masterParam = parameters.getRawParameterValue ("master");
    reverbParam = parameters.getRawParameterValue ("reverb");
}

juce::AudioProcessorValueTreeState::ParameterLayout KnightLyfeProcessor::createParameters()
{
    using namespace juce;
    AudioProcessorValueTreeState::ParameterLayout layout;
    layout.add (std::make_unique<AudioParameterFloat> (ParameterID { "master", 1 }, "Volume",
                                                       NormalisableRange<float> (0.0f, 1.5f), 0.9f));
    layout.add (std::make_unique<AudioParameterFloat> (ParameterID { "reverb", 1 }, "Room",
                                                       NormalisableRange<float> (0.0f, 1.0f), 0.2f));
    return layout;
}

bool KnightLyfeProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto out = layouts.getMainOutputChannelSet();
    return out == juce::AudioChannelSet::stereo() || out == juce::AudioChannelSet::mono();
}

void KnightLyfeProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    engine.prepare (sampleRate, samplesPerBlock);
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

    // The engine renders in stereo; fold to mono if the track is mono.
    auto& stereo = monoScratch;
    juce::AudioBuffer<float>* target = &buffer;
    if (buffer.getNumChannels() < 2)
    {
        stereo.setSize (2, buffer.getNumSamples(), false, false, true); // no allocation within the prepared size
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

    engine.process (*target, midi);

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
    masterGain.applyGain (*target, target->getNumSamples());

    if (target->getNumChannels() >= 2)
    {
        juce::dsp::AudioBlock<float> out (*target);
        auto outStereo = out.getSubsetChannelBlock (0, 2);
        limiter.process (juce::dsp::ProcessContextReplacing<float> (outStereo));
    }

    if (target != &buffer)
    {
        buffer.copyFrom (0, 0, stereo, 0, 0, buffer.getNumSamples());
        buffer.addFrom (0, 0, stereo, 1, 0, buffer.getNumSamples());
        buffer.applyGain (0.5f);
    }

    midi.clear(); // an instrument: nothing goes out
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
