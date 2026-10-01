// Offline tests for the Knight Lyfe sound engine: renders notes and checks the audio.
#include "Engine/SoundEngine.h"

#include <cstdio>
#include <thread>

using namespace knightlyfe;

static int failures = 0;
#define CHECK(cond, msg)                                                              \
    do {                                                                              \
        if (cond) std::printf ("  ok   %s\n", msg);                                   \
        else { std::printf ("  FAIL %s  (%s:%d)\n", msg, __FILE__, __LINE__); ++failures; } \
    } while (0)

struct Render
{
    SoundEngine engine;
    double now = 1000.0;
    static constexpr double sr = 48000.0;
    static constexpr int block = 256;

    Render()
    {
        engine.clockMs = [this] { return now; };
        engine.prepare (sr, block);
        while (! engine.isPianoReady()) // samples decode on a background thread
            juce::Thread::sleep (20);
    }

    /** Renders `seconds` of audio, with optional host MIDI at the start. */
    juce::AudioBuffer<float> run (double seconds, const juce::MidiBuffer& hostMidi = {})
    {
        const int total = (int) (seconds * sr);
        juce::AudioBuffer<float> out (2, total);
        out.clear();
        juce::AudioBuffer<float> buf (2, block);
        for (int pos = 0; pos < total; pos += block)
        {
            const int n = std::min (block, total - pos);
            buf.setSize (2, n, false, false, true);
            juce::MidiBuffer midi;
            if (pos == 0)
                midi = hostMidi;
            engine.process (buf, midi);
            for (int ch = 0; ch < 2; ++ch)
                out.copyFrom (ch, pos, buf, ch, 0, n);
            now += 1000.0 * n / sr;
        }
        return out;
    }
};

static float peak (const juce::AudioBuffer<float>& b, int start = 0, int len = -1)
{
    if (len < 0) len = b.getNumSamples() - start;
    return juce::jmax (b.getMagnitude (0, start, len), b.getMagnitude (1, start, len));
}

static int firstSound (const juce::AudioBuffer<float>& b, float threshold = 0.01f)
{
    for (int i = 0; i < b.getNumSamples(); ++i)
        if (std::abs (b.getSample (0, i)) > threshold || std::abs (b.getSample (1, i)) > threshold)
            return i;
    return -1;
}

int main()
{

    std::printf ("Piano samples\n");
    Render r;
    CHECK (r.engine.getSamples().getNumLoaded() == 120, "all 120 samples decoded (30 notes x 4 layers)");
    CHECK (PianoSamples::nearestSampleNote (61) == 60 && PianoSamples::nearestSampleNote (62) == 63, "nearest sample note");
    CHECK (PianoSamples::layerIndexFor (30) == 0 && PianoSamples::layerIndexFor (127) == 3, "velocity -> layer");
    const auto* bass = r.engine.getSamples().get (21, 64);
    CHECK (bass != nullptr && bass->audio.getNumSamples() / bass->sampleRate > 15.0, "A0 rings for ~16 s");
    CHECK (bass != nullptr && bass->start < 2000, "encoder padding trimmed from the start");

    std::printf ("Interface notes (timed)\n");
    r.engine.postMidi (0, 0x90, 60, 100, 100.0); // song channel, 100 ms from now
    auto a = r.run (1.0);
    const int onset = firstSound (a);
    CHECK (onset > 0, "middle C sounds");
    CHECK (std::abs (onset - (int) (0.1 * Render::sr)) < 600, "it starts ~100 ms later, as scheduled");
    r.engine.postMidi (0, 0x80, 60, 0, 0.0);
    r.run (1.5);
    CHECK (peak (r.run (0.2)) < 0.001f, "note-off releases it");

    std::printf ("Velocity layers\n");
    r.engine.postMidi (16, 0x90, 64, 30, 0.0);
    const float soft = peak (r.run (0.5));
    r.engine.postMidi (16, 0x80, 64, 0, 0.0);
    r.run (1.5);
    r.engine.postMidi (16, 0x90, 64, 120, 0.0);
    const float loud = peak (r.run (0.5));
    r.engine.postMidi (16, 0x80, 64, 0, 0.0);
    r.run (1.5);
    std::printf ("       soft peak %.3f, loud peak %.3f\n", soft, loud);
    CHECK (loud > soft * 2.0f, "hard playing is much louder (different recordings)");

    std::printf ("Host MIDI (Logic / keyboard)\n");
    juce::MidiBuffer host;
    host.addEvent (juce::MidiMessage::noteOn (1, 67, (juce::uint8) 90), 0);
    auto h = r.run (0.3, host);
    CHECK (peak (h) > 0.05f, "a note from the host plays immediately");
    std::vector<SoundEngine::HostMessage> forUi;
    r.engine.drainHostMidi (forUi);
    CHECK (forUi.size() == 1 && forUi[0].status == 0x90 && forUi[0].data1 == 67, "and is forwarded to the interface");
    juce::MidiBuffer off;
    off.addEvent (juce::MidiMessage::noteOff (1, 67), 0);
    r.run (1.5, off);

    std::printf ("Sustain pedal\n");
    juce::MidiBuffer ped;
    ped.addEvent (juce::MidiMessage::controllerEvent (1, 64, 127), 0);
    ped.addEvent (juce::MidiMessage::noteOn (1, 48, (juce::uint8) 90), 1);
    ped.addEvent (juce::MidiMessage::noteOff (1, 48), 2000);
    r.run (0.2, ped);
    CHECK (peak (r.run (0.5)) > 0.02f, "held by the pedal after key-up");
    juce::MidiBuffer up;
    up.addEvent (juce::MidiMessage::controllerEvent (1, 64, 0), 0);
    r.run (2.0, up);
    CHECK (peak (r.run (0.2)) < 0.001f, "released when the pedal comes up");

    std::printf ("Drums and mixer\n");
    r.engine.postMidi (18, 0x99, 36, 110, 0.0); // groove kick
    CHECK (peak (r.run (0.3)) > 0.1f, "groove kick sounds");
    r.run (1.0);
    r.engine.setChannelGain (18, 0.0f);
    r.engine.postMidi (18, 0x99, 38, 110, 0.0);
    CHECK (peak (r.run (0.3)) < 0.001f, "muted channel is silent");
    r.engine.setChannelGain (18, 1.0f);

    std::printf ("Cancel and all-notes-off\n");
    r.engine.postMidi (18, 0x99, 36, 110, 200.0);
    r.engine.postCancel (18, 0.0);
    CHECK (peak (r.run (0.5)) < 0.001f, "a cancelled groove hit never plays");
    r.engine.postMidi (0, 0x90, 60, 100, 300.0);
    r.engine.postAllNotesOff (0.0);
    CHECK (peak (r.run (0.6)) < 0.001f, "stopping a song drops its scheduled notes");
    r.engine.postMidi (0, 0x90, 60, 100, 0.0);
    r.run (0.2);
    r.engine.postPanic();
    r.run (0.05);
    CHECK (peak (r.run (0.2)) < 0.001f, "panic silences everything");

    std::printf ("Interface bridge (the JSON knight-keys/js/host.js sends)\n");
    r.run (1.0);
    auto json = juce::JSON::parse (R"({"batch":[{"g":[18,0.5]},{"m":[18,153,36,110,0]},{"v":0.8}]})");
    r.engine.handleInterfaceBatch (json);
    const float halfKick = peak (r.run (0.3));
    r.run (1.0);
    r.engine.handleInterfaceBatch (juce::JSON::parse (R"({"batch":[{"g":[18,1]},{"v":1},{"m":[18,153,36,110,0]}]})"));
    const float fullKick = peak (r.run (0.3));
    std::printf ("       kick at gain 0.5 x volume 0.8: %.3f, full: %.3f\n", halfKick, fullKick);
    CHECK (halfKick > 0.05f && std::abs (halfKick / fullKick - 0.4f) < 0.05f, "gain and volume messages scale the sound");
    r.run (1.0);
    r.engine.handleInterfaceBatch (juce::JSON::parse (R"({"batch":[{"m":[0,144,60,100,200]},{"off":0}]})"));
    CHECK (peak (r.run (0.5)) < 0.001f, "off message drops scheduled song notes");
    r.engine.handleInterfaceBatch (juce::JSON::parse (R"({"batch":[{"m":[16,144,60,100,0]},{"panic":1}]})"));
    r.run (0.05);
    CHECK (peak (r.run (0.2)) < 0.001f, "panic message works");

    std::printf ("Host transport\n");
    {
        SoundEngine e;
        CHECK (! e.getHostPosition().valid, "no position until the host reports one");
        SoundEngine::HostPosition hp;
        hp.valid = true; hp.playing = true; hp.bpm = 92.5; hp.ppq = 17.25; hp.num = 6; hp.den = 8; hp.wallMs = 4321.0;
        e.setHostPosition (hp);
        const auto got = e.getHostPosition();
        CHECK (got.valid && got.playing && juce::exactlyEqual (got.bpm, 92.5) && juce::exactlyEqual (got.ppq, 17.25)
                   && got.num == 6 && got.den == 8 && juce::exactlyEqual (got.wallMs, 4321.0),
               "tempo, position and time signature round-trip");

        // A reader racing a writer never sees a half-written position.
        hp.bpm = 60.0; hp.ppq = 120.0; hp.wallMs = 180.0;
        e.setHostPosition (hp);
        std::atomic<bool> stop { false };
        std::thread writer ([&] {
            for (int i = 0; ! stop; ++i)
            {
                SoundEngine::HostPosition w;
                w.valid = true; w.bpm = 60.0 + (i % 100); w.ppq = w.bpm * 2.0; w.wallMs = w.bpm * 3.0;
                e.setHostPosition (w);
            }
        });
        bool consistent = true;
        for (int i = 0; i < 200000; ++i)
        {
            const auto r2 = e.getHostPosition();
            if (! juce::exactlyEqual (r2.ppq, r2.bpm * 2.0) || ! juce::exactlyEqual (r2.wallMs, r2.bpm * 3.0))
                consistent = false;
        }
        stop = true;
        writer.join();
        CHECK (consistent, "position reads are never torn");
    }

    std::printf (failures == 0 ? "\nAll engine tests passed\n" : "\n%d engine test(s) FAILED\n", failures);
    return failures == 0 ? 0 : 1;
}
