#include "SoundEngine.h"

namespace knightlyfe
{

SoundEngine::SoundEngine()
{
    for (auto& g : songGains) g = 1.0f;
    for (auto& g : liveGains) g = 1.0f;
    for (auto& g : uiGains) g = 1.0f;
    pending.reserve (8192);
}

void SoundEngine::prepare (double sr, int maxBlockSize)
{
    sampleRate = sr;
    songPiano.setCurrentPlaybackSampleRate (sr);
    livePiano.setCurrentPlaybackSampleRate (sr);
    drums.prepare (sr);
    songMidi.ensureSize (4096);
    liveMidi.ensureSize (4096);
    juce::ignoreUnused (maxBlockSize);
}

//==============================================================================
void SoundEngine::push (const Command& c)
{
    const auto scope = commandFifo.write (1);
    if (scope.blockSize1 > 0)
        commandSlots[(size_t) scope.startIndex1] = c;
    // When the queue is full the event is dropped rather than blocking the UI.
}

void SoundEngine::postMidi (int ch, int status, int d1, int d2, double delayMs)
{
    if (ch < 0 || ch >= ui::numChannels)
        return;
    push ({ Kind::midi, clockMs() + juce::jmax (0.0, delayMs), (juce::int8) ch,
            (juce::uint8) status, (juce::uint8) d1, (juce::uint8) d2 });
}

void SoundEngine::postAllNotesOff (double delayMs)
{
    push ({ Kind::allOff, clockMs() + juce::jmax (0.0, delayMs), -1, 0, 0, 0 });
}

void SoundEngine::postCancel (int ch, double delayMs)
{
    push ({ Kind::cancel, clockMs() + juce::jmax (0.0, delayMs), (juce::int8) ch, 0, 0, 0 });
}

void SoundEngine::postPanic()
{
    push ({ Kind::panic, 0.0, -1, 0, 0, 0 });
}

void SoundEngine::setChannelGain (int ch, float gain)
{
    if (ch < 0 || ch >= ui::numChannels)
        return;
    uiGains[(size_t) ch] = gain;
    if (ch < 16)
        songGains[(size_t) ch + 1] = gain;
    if (ch == ui::live)
        for (auto& g : liveGains) g = gain;
}

void SoundEngine::handleInterfaceBatch (const juce::var& v)
{
    const auto* batch = v.getProperty ("batch", {}).getArray();
    if (batch == nullptr)
        return;

    for (const auto& item : *batch)
    {
        if (const auto* m = item.getProperty ("m", {}).getArray(); m != nullptr && m->size() >= 5)
            postMidi ((int) (*m)[0], (int) (*m)[1], (int) (*m)[2], (int) (*m)[3], (double) (*m)[4]);
        else if (const auto* g = item.getProperty ("g", {}).getArray(); g != nullptr && g->size() >= 2)
            setChannelGain ((int) (*g)[0], (float) (double) (*g)[1]);
        else if (item.hasProperty ("off"))
            postAllNotesOff ((double) item.getProperty ("off", 0.0));
        else if (item.hasProperty ("cancel"))
            postCancel ((int) item.getProperty ("cancel", -1), (double) item.getProperty ("at", 0.0));
        else if (item.hasProperty ("panic"))
            postPanic();
        else if (item.hasProperty ("v"))
            setInterfaceVolume ((float) (double) item.getProperty ("v", 1.0));
    }
}

int SoundEngine::drainHostMidi (std::vector<HostMessage>& out)
{
    const auto scope = hostFifo.read (hostFifo.getNumReady());
    for (int i = 0; i < scope.blockSize1; ++i) out.push_back (hostSlots[(size_t) (scope.startIndex1 + i)]);
    for (int i = 0; i < scope.blockSize2; ++i) out.push_back (hostSlots[(size_t) (scope.startIndex2 + i)]);
    return scope.blockSize1 + scope.blockSize2;
}

//==============================================================================
static bool isSongChannel (int ch) { return ch >= 0 && ch < 16; }

void SoundEngine::routeToEngines (const Command& c, int offset)
{
    const int ch = c.channel;
    const int type = c.status & 0xf0;

    if (ch == ui::drums || ch == ui::groove)
    {
        if (type == 0x90 && c.data2 > 0)
            drums.trigger (c.data1, c.data2, uiGains[(size_t) ch].load(), offset);
        return;
    }

    // Song channels keep their own MIDI channel; your playing uses channels 1 and 2.
    auto& target = isSongChannel (ch) ? songMidi : liveMidi;
    const int midiChannel = isSongChannel (ch) ? ch + 1 : (ch == ui::liveLeft ? 2 : 1);
    target.addEvent (juce::MidiMessage (type | (midiChannel - 1), c.data1, c.data2), offset);
}

void SoundEngine::routeHostMessage (const juce::MidiMessage& m, int offset)
{
    if (m.getChannel() == 10)
    {
        if (m.isNoteOn())
            drums.trigger (m.getNoteNumber(), m.getVelocity(), uiGains[(size_t) ui::groove].load(), offset);
    }
    else
    {
        liveMidi.addEvent (m, offset);
    }

    // Tell the interface (notes, pedals, wheels) so it can light up and run learn mode.
    if (m.isNoteOnOrOff() || m.isController() || m.isPitchWheel())
    {
        const auto* raw = m.getRawData();
        const auto scope = hostFifo.write (1);
        if (scope.blockSize1 > 0)
            hostSlots[(size_t) scope.startIndex1] = { raw[0], raw[1], (juce::uint8) (m.getRawDataSize() > 2 ? raw[2] : 0) };
    }
}

void SoundEngine::process (juce::AudioBuffer<float>& buffer, const juce::MidiBuffer& hostMidi)
{
    const int numSamples = buffer.getNumSamples();
    const double blockStart = clockMs();
    const double blockEnd = blockStart + 1000.0 * numSamples / sampleRate;

    // 1. Take new commands from the interface.
    {
        const auto scope = commandFifo.read (commandFifo.getNumReady());
        auto take = [this] (int start, int size) {
            for (int i = 0; i < size; ++i)
            {
                const auto& c = commandSlots[(size_t) (start + i)];
                if (c.kind == Kind::panic)
                    pending.clear();
                if (c.kind == Kind::cancel || c.kind == Kind::allOff)
                {
                    // Drop anything scheduled from that moment on for the affected channels.
                    const bool all = c.kind == Kind::allOff || c.channel < 0;
                    pending.erase (std::remove_if (pending.begin(), pending.end(), [&] (const Command& p) {
                                       const bool songSide = isSongChannel (p.channel);
                                       const bool hit = c.kind == Kind::allOff ? songSide : (all || p.channel == c.channel);
                                       return p.kind == Kind::midi && hit && p.dueMs >= c.dueMs;
                                   }),
                                   pending.end());
                    if (c.kind == Kind::cancel)
                        continue; // cancelling only removes scheduled hits
                }
                if (pending.size() < pending.capacity())
                    pending.push_back (c);
            }
        };
        take (scope.startIndex1, scope.blockSize1);
        take (scope.startIndex2, scope.blockSize2);
        std::stable_sort (pending.begin(), pending.end(),
                          [] (const Command& a, const Command& b) { return a.dueMs < b.dueMs; });
    }

    songMidi.clear();
    liveMidi.clear();

    // 2. Commands that fall inside this block, at their sample position.
    size_t used = 0;
    for (; used < pending.size() && pending[used].dueMs < blockEnd; ++used)
    {
        const auto& c = pending[used];
        const int offset = juce::jlimit (0, numSamples - 1, (int) ((c.dueMs - blockStart) * sampleRate / 1000.0));
        switch (c.kind)
        {
            case Kind::midi:
                routeToEngines (c, offset);
                break;
            case Kind::allOff:
                for (int ch = 1; ch <= 16; ++ch)
                {
                    songMidi.addEvent (juce::MidiMessage::controllerEvent (ch, 64, 0), offset);
                    songMidi.addEvent (juce::MidiMessage::allNotesOff (ch), offset);
                }
                break;
            case Kind::panic:
                songPiano.allNotesOff (0, false);
                livePiano.allNotesOff (0, false);
                drums.stopAll();
                break;
            case Kind::cancel:
                break;
        }
    }
    pending.erase (pending.begin(), pending.begin() + (long) used);

    // 3. Host MIDI plays right away.
    for (const auto meta : hostMidi)
        routeHostMessage (meta.getMessage(), meta.samplePosition);

    // 4. Render.
    buffer.clear();
    songPiano.renderNextBlock (buffer, songMidi, 0, numSamples);
    livePiano.renderNextBlock (buffer, liveMidi, 0, numSamples);
    drums.render (buffer, 0, numSamples);
    buffer.applyGain (interfaceVolume.load());
}

} // namespace knightlyfe
