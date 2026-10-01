#pragma once

#include "PianoEngine.h"
#include "DrumSynth.h"

#include <atomic>
#include <functional>
#include <vector>

namespace knightlyfe
{

/** Channels used by the Knight Keys interface (see knight-keys/js/synth.js). */
namespace ui
{
    constexpr int drums = 9;      // MIDI channel 10 in songs
    constexpr int live = 16;      // your playing (mouse / computer keys)
    constexpr int liveLeft = 17;  // left side of a split
    constexpr int groove = 18;    // groove player and drum pads
    constexpr int numChannels = 19;
}

/**
    Makes all the sound for the plug-in and standalone app.

    Two kinds of input arrive:
      - Host MIDI (Logic, or MIDI devices in the standalone app), played immediately and
        sample-accurately, and also queued for the interface so the keys light up.
      - Timed commands from the interface (song playback, grooves, mouse playing), each
        with a delay in milliseconds so they land on time despite the message hop.

    Thread use: the post and set functions and drainHostMidi() are called from the
    message thread; process() from the audio thread.
*/
class SoundEngine
{
public:
    SoundEngine();

    void prepare (double sampleRate, int maxBlockSize);
    void process (juce::AudioBuffer<float>& buffer, const juce::MidiBuffer& hostMidi);

    // ---- From the interface (message thread) ----------------------------------
    void postMidi (int uiChannel, int status, int data1, int data2, double delayMs);
    void postAllNotesOff (double delayMs);
    void postCancel (int uiChannel, double delayMs); // -1 = every channel
    void postPanic();
    void setChannelGain (int uiChannel, float gain);
    void setInterfaceVolume (float v) { interfaceVolume = v; }

    /** Applies a batch the interface sent with emitEvent("kk", { batch: [...] }).
        Items: { m: [ch, status, d1, d2, delayMs] }, { g: [ch, gain] }, { off: delayMs },
        { cancel: ch, at: delayMs }, { panic: 1 }, { v: volume }. See knight-keys/js/host.js. */
    void handleInterfaceBatch (const juce::var& batch);

    // ---- To the interface (message thread) ------------------------------------
    struct HostMessage { juce::uint8 status, data1, data2; };
    int drainHostMidi (std::vector<HostMessage>& out);

    // ---- Host transport (Logic's tempo and position) ---------------------------
    struct HostPosition
    {
        bool valid = false;    // the host reported a position
        bool playing = false;
        double bpm = 120.0;
        double ppq = 0.0;      // quarter notes from the start of the project (bar 1)
        int num = 4, den = 4;  // time signature
        double wallMs = 0.0;   // clockMs() at the start of the block
    };

    /** Audio thread: remember where the host's playhead is at the start of this block. */
    void setHostPosition (const HostPosition&) noexcept;
    /** Any thread: the latest position (lock-free; never torn). */
    HostPosition getHostPosition() const noexcept;

    bool isPianoReady() const { return samples->isReady(); }
    const PianoSamples& getSamples() const { return *samples; }

    /** Milliseconds clock; replaceable so tests can render faster than real time. */
    std::function<double()> clockMs = [] { return juce::Time::getMillisecondCounterHiRes(); };

private:
    enum class Kind : juce::uint8 { midi, allOff, cancel, panic };

    struct Command
    {
        Kind kind = Kind::midi;
        double dueMs = 0.0;
        juce::int8 channel = 0;
        juce::uint8 status = 0, data1 = 0, data2 = 0;
    };

    void push (const Command&);
    void routeToEngines (const Command&, int offset);
    void routeHostMessage (const juce::MidiMessage&, int offset);

    juce::SharedResourcePointer<PianoSamples> samples;

    ChannelGains songGains, liveGains;
    std::array<std::atomic<float>, ui::numChannels> uiGains;
    std::atomic<float> interfaceVolume { 1.0f };

    PianoSynth songPiano { *samples, songGains };
    PianoSynth livePiano { *samples, liveGains };
    DrumSynth drums;

    juce::MidiBuffer songMidi, liveMidi;

    // Interface -> audio thread
    juce::AbstractFifo commandFifo { 8192 };
    std::vector<Command> commandSlots = std::vector<Command> (8192);
    std::vector<Command> pending; // audio thread only, kept sorted by due time

    // Audio thread -> interface
    juce::AbstractFifo hostFifo { 2048 };
    std::vector<HostMessage> hostSlots = std::vector<HostMessage> (2048);

    // Host position, published by the audio thread with a sequence lock.
    std::atomic<juce::uint32> positionSeq { 0 };
    std::atomic<bool> posValid { false }, posPlaying { false };
    std::atomic<double> posBpm { 120.0 }, posPpq { 0.0 }, posWallMs { 0.0 };
    std::atomic<int> posNum { 4 }, posDen { 4 };

    double sampleRate = 44100.0;
};

} // namespace knightlyfe
