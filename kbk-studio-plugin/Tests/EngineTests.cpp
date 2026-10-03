// Offline tests for the KBK Studio engine: auto-chop, link rules, the pad
// sampler and decoding. Exits non-zero on failure (used in CI).

#include <juce_audio_formats/juce_audio_formats.h>

#include "Engine/AudioLoader.h"
#include "Engine/AutoChop.h"
#include "Engine/NeuralTone.h"
#include "Engine/PadSampler.h"

#include <cmath>
#include <cstdio>
#include <functional>

namespace
{
int failures = 0, checks = 0;

#define CHECK(cond, msg)                                                       \
    do                                                                         \
    {                                                                          \
        ++checks;                                                              \
        if (! (cond))                                                          \
        {                                                                      \
            ++failures;                                                        \
            std::printf ("  FAIL %s:%d  %s\n", __FILE__, __LINE__, juce::String (msg).toRawUTF8()); \
        }                                                                      \
    } while (false)

void run (const char* name, const std::function<void()>& fn)
{
    const int before = failures;
    fn();
    std::printf ("%s %s\n", failures == before ? "ok  " : "FAIL", name);
}

constexpr double rate = 22050.0;

void hitAt (juce::AudioBuffer<float>& b, double t, int len = 2500)
{
    const int s = (int) std::round (t * rate);
    for (int i = 0; i < len && s + i < b.getNumSamples(); ++i)
        b.addSample (0, s + i, std::exp (-i / 300.0f) * std::sin (i * 0.3f) * 0.8f);
}

juce::AudioBuffer<float> sine (int samples, float hz, double sr, float amp = 0.5f, int chans = 1)
{
    juce::AudioBuffer<float> b (chans, samples);
    for (int c = 0; c < chans; ++c)
        for (int i = 0; i < samples; ++i)
            b.setSample (c, i, amp * std::sin (juce::MathConstants<float>::twoPi * hz * (float) i / (float) sr));
    return b;
}

juce::MidiBuffer notes (std::initializer_list<juce::MidiMessage> msgs)
{
    juce::MidiBuffer m;
    for (auto& msg : msgs)
        m.addEvent (msg, 0);
    return m;
}

// Renders `blocks` blocks of 512 at 44.1 kHz, MIDI in the first block only.
juce::AudioBuffer<float> renderBlocks (kbk::PadSampler& s, const juce::MidiBuffer& first, int blocks)
{
    juce::AudioBuffer<float> all (2, blocks * 512), block (2, 512);
    for (int k = 0; k < blocks; ++k)
    {
        s.render (block, k == 0 ? first : juce::MidiBuffer());
        for (int c = 0; c < 2; ++c)
            all.copyFrom (c, k * 512, block, c, 0, 512);
    }
    return all;
}

std::unique_ptr<kbk::PadSampler> newSampler()
{
    auto s = std::make_unique<kbk::PadSampler>();
    s->prepare (44100.0, 512);
    kbk::MasterSettings m;
    m.glueOn = false;
    m.limiterOn = false;
    s->setMaster (m);
    return s;
}

kbk::Pad padWith (juce::AudioBuffer<float> audio, double sr = 44100.0)
{
    kbk::Pad p;
    p.audio = std::make_shared<const juce::AudioBuffer<float>> (std::move (audio));
    p.sourceRate = sr;
    p.gain = 1.0f;
    p.name = "test";
    return p;
}

int zeroCrossings (const juce::AudioBuffer<float>& b, int from, int to)
{
    int z = 0;
    for (int i = from + 1; i < to; ++i)
        if ((b.getSample (0, i - 1) < 0.0f) != (b.getSample (0, i) < 0.0f))
            ++z;
    return z;
}
} // namespace

int main()
{
    // ---- auto-chop --------------------------------------------------------------
    run ("auto-chop: one-shot stays whole", []
    {
        auto r = kbk::autoChop (sine ((int) rate, 200.0f, rate), rate);
        CHECK (r.kind == kbk::ChopResult::Kind::OneShot, "kind");
    });

    run ("auto-chop: a loop is cut at its hits", []
    {
        juce::AudioBuffer<float> loop (1, (int) rate * 4);
        loop.clear();
        const double hits[] = { 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 };
        for (auto h : hits)
            hitAt (loop, h);
        auto r = kbk::autoChop (loop, rate);
        CHECK (r.kind == kbk::ChopResult::Kind::Loop, "kind");
        CHECK (r.ranges.size() == 8, "8 slices, got " + juce::String ((int) r.ranges.size()));
        for (auto h : hits)
        {
            bool found = false;
            for (auto& rg : r.ranges)
                found = found || std::abs (rg.first - h) < 0.03;
            CHECK (found, "slice at " + juce::String (h));
        }
    });

    run ("auto-chop: a song is spread across 16 pads, one bar each, on the beat", []
    {
        juce::AudioBuffer<float> song (1, (int) rate * 64);
        song.clear();
        for (int b = 0; b * 0.6 < 63.5; ++b)
            hitAt (song, b * 0.6, b % 4 == 0 ? 4000 : 2500);
        for (int i = 0; i < song.getNumSamples(); ++i)
            song.addSample (0, i, 0.05f * std::sin (juce::MathConstants<float>::twoPi * 220.0f * (float) i / (float) rate));
        const double bpm = kbk::estimateTempo (song, rate);
        CHECK (std::abs (bpm - 100.0) <= 2.0, "tempo " + juce::String (bpm));
        auto r = kbk::autoChop (song, rate);
        CHECK (r.kind == kbk::ChopResult::Kind::Song, "kind");
        CHECK (r.ranges.size() == 16, "16 chops");
        CHECK (r.ranges.front().first < 4.0 && r.ranges.back().first > 56.0, "spread through the song");
        for (size_t i = 1; i < r.ranges.size(); ++i)
            CHECK (r.ranges[i].first > r.ranges[i - 1].first, "in order");
        for (auto& [a, b] : r.ranges)
        {
            CHECK (std::abs (a / 0.6 - std::round (a / 0.6)) < 0.05, "starts on a beat: " + juce::String (a));
            CHECK (b - a > 1.7 && b - a < 2.7, "about a bar: " + juce::String (b - a));
        }
        auto piece = kbk::cut (song, rate, r.ranges[3]);
        CHECK (std::abs (piece.getNumSamples() - (r.ranges[3].second - r.ranges[3].first) * rate) < 2.0, "cut length");
        CHECK (std::abs (piece.getSample (0, 0)) < 1e-6f, "cut fades in");
    });

    run ("chop by hits and equal slices", []
    {
        juce::AudioBuffer<float> loop (1, (int) rate * 2);
        loop.clear();
        hitAt (loop, 0.0);
        hitAt (loop, 0.7);
        hitAt (loop, 1.3);
        auto h = kbk::chopAtHits (loop, rate);
        CHECK (h.size() == 3, "3 hits, got " + juce::String ((int) h.size()));
        auto e = kbk::chopEqual (8.0, 4);
        CHECK (e.size() == 4 && e[2].first == 4.0 && e[3].second == 8.0, "equal slices");
    });

    // ---- links ------------------------------------------------------------------------
    run ("links: share links, video pages, DRM", []
    {
        using K = kbk::LinkInfo::Kind;
        auto d = kbk::normalizeLink ("https://example.com/kits/kick.wav?x=1");
        CHECK (d.kind == K::Direct, "direct");
        CHECK (kbk::normalizeLink ("example.com/a.mp3").url == "https://example.com/a.mp3", "adds https");
        auto db = kbk::normalizeLink ("https://www.dropbox.com/s/abc/snare.wav?dl=0");
        CHECK (db.url.contains ("raw=1") && ! db.url.contains ("dl=0"), db.url);
        auto gd = kbk::normalizeLink ("https://drive.google.com/file/d/1AbC-xyz_9/view?usp=sharing");
        CHECK (gd.url == "https://drive.google.com/uc?export=download&id=1AbC-xyz_9" && gd.kind == K::Helper, gd.url);
        CHECK (kbk::normalizeLink ("https://github.com/me/kit/blob/main/808.wav").url == "https://raw.githubusercontent.com/me/kit/main/808.wav", "github");
        CHECK (kbk::normalizeLink ("https://youtu.be/zH74g3l7eH4?si=QN").kind == K::Page, "youtu.be");
        CHECK (kbk::normalizeLink ("https://www.youtube.com/watch?v=abc").kind == K::Page, "youtube");
        CHECK (kbk::normalizeLink ("https://open.spotify.com/track/1").kind == K::Drm, "spotify");
        CHECK (kbk::normalizeLink ("https://example.com/song").kind == K::Unknown, "unknown");
        CHECK (kbk::normalizeLink ("just words").url.isEmpty(), "words");
        CHECK (kbk::normalizeLink ("ftp://x.com/a.wav").url.isEmpty(), "ftp");
        CHECK (kbk::nameFromUrl ("https://x.com/a/My%20Kick.wav") == "My Kick", kbk::nameFromUrl ("https://x.com/a/My%20Kick.wav"));
        CHECK (kbk::nameFromUrl ("https://www.youtube.com/watch?v=abc") == "youtube-abc", "yt name");
    });

    run ("sniffing catches a web page posing as audio", []
    {
        auto mb = [] (const char* s, size_t n = 0) { return juce::MemoryBlock (s, n > 0 ? n : strlen (s)); };
        CHECK (kbk::sniff (mb ("<!DOCTYPE html><html>")) == "html", "html");
        CHECK (kbk::sniff (mb ("RIFF\x10\0\0\0WAVEfmt ", 16)) == "wav", "wav");
        CHECK (kbk::sniff (mb ("fLaC\0\0\0\0", 8)) == "flac", "flac");
        CHECK (kbk::sniff (mb ("ID3\x04\0\0", 6)) == "mp3", "mp3");
    });

    // ---- decoding ----------------------------------------------------------------------
    run ("decoder reads WAV and FLAC bytes, refuses HTML", []
    {
        kbk::AudioLoader loader;
        auto audio = sine (4410, 440.0f, 44100.0, 0.5f, 2);
        for (auto* fmtName : { "wav", "flac" })
        {
            juce::MemoryBlock mb;
            std::unique_ptr<juce::AudioFormat> fmt;
            if (juce::String (fmtName) == "wav")
                fmt = std::make_unique<juce::WavAudioFormat>();
            else
                fmt = std::make_unique<juce::FlacAudioFormat>();
            {
                std::unique_ptr<juce::OutputStream> os = std::make_unique<juce::MemoryOutputStream> (mb, false);
                auto w = fmt->createWriterFor (os, juce::AudioFormatWriterOptions {}.withSampleRate (44100.0).withNumChannels (2).withBitsPerSample (24));
                w->writeFromAudioSampleBuffer (audio, 0, audio.getNumSamples());
            }
            auto r = loader.decode (mb, "x", false);
            CHECK (r.ok(), juce::String (fmtName) + ": " + r.error);
            CHECK (r.audio.getNumChannels() == 2 && r.audio.getNumSamples() == 4410 && r.sampleRate == 44100.0, fmtName);
            CHECK (std::abs (r.audio.getSample (1, 100) - audio.getSample (1, 100)) < 1e-4f, fmtName);
        }
        auto html = loader.decode (juce::MemoryBlock ("<html></html>", 13), "x", false);
        CHECK (! html.ok() && html.error.contains ("web page"), html.error);
    });

    // ---- sampler ---------------------------------------------------------------------------
    run ("sampler: MIDI C1 plays pad 1, other keys don't (Pads mode)", []
    {
        auto sPtr = newSampler();
        auto& s = *sPtr;
        s.setPad (0, padWith (sine (44100, 220.0f, 44100.0)));
        auto out = renderBlocks (s, notes ({ juce::MidiMessage::noteOn (10, 36, (juce::uint8) 100) }), 8);
        CHECK (out.getMagnitude (0, 0, out.getNumSamples()) > 0.2f, "pad 1 sounds");
        CHECK (s.hits[0].load() == 1, "hit counted");
        auto s2Ptr = newSampler();
        auto& s2 = *s2Ptr;
        s2.setPad (0, padWith (sine (44100, 220.0f, 44100.0)));
        auto quiet = renderBlocks (s2, notes ({ juce::MidiMessage::noteOn (1, 60, (juce::uint8) 100) }), 8);
        CHECK (quiet.getMagnitude (0, 0, quiet.getNumSamples()) < 1e-6f, "C3 is not a pad note");
    });

    run ("sampler: velocity makes soft hits quieter", []
    {
        auto loudPtr = newSampler(), softPtr = newSampler();
        auto& loud = *loudPtr;
        auto& soft = *softPtr;
        loud.setPad (0, padWith (sine (44100, 220.0f, 44100.0)));
        soft.setPad (0, padWith (sine (44100, 220.0f, 44100.0)));
        auto a = renderBlocks (loud, notes ({ juce::MidiMessage::noteOn (1, 36, (juce::uint8) 127) }), 4);
        auto b = renderBlocks (soft, notes ({ juce::MidiMessage::noteOn (1, 36, (juce::uint8) 30) }), 4);
        CHECK (b.getMagnitude (0, 0, 2048) < a.getMagnitude (0, 0, 2048) * 0.5f, "soft < loud");
    });

    run ("sampler: Keys mode plays the selected pad an octave up at double speed", []
    {
        auto sPtr = newSampler();
        auto& s = *sPtr;
        s.setPad (3, padWith (sine (44100, 200.0f, 44100.0)));
        s.selectedPad = 3;
        s.keyMode = (int) kbk::KeyMode::Keys;
        auto root = renderBlocks (s, notes ({ juce::MidiMessage::noteOn (1, 60, (juce::uint8) 100) }), 8);
        auto s2Ptr = newSampler();
        auto& s2 = *s2Ptr;
        s2.setPad (3, padWith (sine (44100, 200.0f, 44100.0)));
        s2.selectedPad = 3;
        s2.keyMode = (int) kbk::KeyMode::Keys;
        auto up = renderBlocks (s2, notes ({ juce::MidiMessage::noteOn (1, 72, (juce::uint8) 100) }), 8);
        const int z1 = zeroCrossings (root, 1000, 4000), z2 = zeroCrossings (up, 1000, 4000);
        CHECK (std::abs ((double) z2 / z1 - 2.0) < 0.1, "ratio " + juce::String ((double) z2 / z1));
    });

    run ("sampler: Split mode = pads below, selected pad in pitch above", []
    {
        auto sPtr = newSampler();
        auto& s = *sPtr;
        s.setPad (0, padWith (sine (44100, 200.0f, 44100.0)));
        s.setPad (5, padWith (sine (44100, 300.0f, 44100.0)));
        s.selectedPad = 5;
        s.keyMode = (int) kbk::KeyMode::Split;
        renderBlocks (s, notes ({ juce::MidiMessage::noteOn (1, 36, (juce::uint8) 100), juce::MidiMessage::noteOn (1, 72, (juce::uint8) 100),
                                  juce::MidiMessage::noteOn (1, 30, (juce::uint8) 100) }),
                      2);
        CHECK (s.hits[0].load() == 1 && s.hits[5].load() == 1, "pad 1 and the selected pad");
    });

    run ("sampler: hold pads stop on key up, one-shots ring on", []
    {
        auto gatePtr = newSampler();
        auto& gate = *gatePtr;
        auto p = padWith (sine (44100, 220.0f, 44100.0));
        p.mode = kbk::PlayMode::Gate;
        gate.setPad (0, p);
        juce::MidiBuffer m;
        m.addEvent (juce::MidiMessage::noteOn (1, 36, (juce::uint8) 100), 0);
        m.addEvent (juce::MidiMessage::noteOff (1, 36), 100);
        auto g = renderBlocks (gate, m, 16);
        CHECK (g.getMagnitude (0, 6000, 2000) < 1e-4f, "gate is silent after release");
        auto onePtr = newSampler();
        auto& one = *onePtr;
        one.setPad (0, padWith (sine (44100, 220.0f, 44100.0)));
        auto o = renderBlocks (one, m, 16);
        CHECK (o.getMagnitude (0, 6000, 2000) > 0.2f, "one-shot keeps playing");
    });

    run ("sampler: chops in a choke group cut each other off", []
    {
        auto sPtr = newSampler();
        auto& s = *sPtr;
        auto a = padWith (sine (88200, 220.0f, 44100.0));
        auto b = padWith (sine (88200, 330.0f, 44100.0));
        a.choke = b.choke = 4;
        s.setPad (0, a);
        s.setPad (1, b);
        juce::MidiBuffer m;
        m.addEvent (juce::MidiMessage::noteOn (1, 36, (juce::uint8) 100), 0);
        m.addEvent (juce::MidiMessage::noteOn (1, 37, (juce::uint8) 100), 256);
        auto out = renderBlocks (s, m, 16);
        // only pad 2's 330 Hz is left: about 330 * 2 crossings per second
        const int z = zeroCrossings (out, 4000, 4000 + 44100 / 10);
        CHECK (std::abs (z - 66) <= 3, "crossings " + juce::String (z));
    });

    run ("sampler: start/end trim and reverse", []
    {
        auto sPtr = newSampler();
        auto& s = *sPtr;
        juce::AudioBuffer<float> ramp (1, 44100);
        for (int i = 0; i < 44100; ++i)
            ramp.setSample (0, i, i < 22050 ? 0.0f : 0.5f);
        auto p = padWith (ramp);
        p.start = 0.5f;
        s.setPad (0, p);
        auto out = renderBlocks (s, notes ({ juce::MidiMessage::noteOn (1, 36, (juce::uint8) 127) }), 4);
        CHECK (out.getMagnitude (0, 200, 1000) > 0.3f, "starts in the loud half");
        auto rPtr = newSampler();
        auto& r = *rPtr;
        auto q = padWith (ramp);
        q.reverse = true;
        r.setPad (0, q);
        auto rev = renderBlocks (r, notes ({ juce::MidiMessage::noteOn (1, 36, (juce::uint8) 127) }), 4);
        CHECK (rev.getMagnitude (0, 200, 1000) > 0.3f, "reverse starts at the end");
    });

    run ("sampler: plays a 22 kHz sample at the right pitch on a 44.1 kHz session", []
    {
        auto sPtr = newSampler();
        auto& s = *sPtr;
        s.setPad (0, padWith (sine (22050, 200.0f, 22050.0), 22050.0));
        auto out = renderBlocks (s, notes ({ juce::MidiMessage::noteOn (1, 36, (juce::uint8) 127) }), 8);
        const int z = zeroCrossings (out, 1000, 1000 + 4410);
        CHECK (std::abs (z - 40) <= 2, "200 Hz -> 40 crossings in 0.1 s, got " + juce::String (z));
    });

    run ("master: the limiter holds the ceiling", []
    {
        kbk::PadSampler s;
        s.prepare (44100.0, 512);
        kbk::MasterSettings m;
        m.glueOn = true;
        m.tapeOn = true;
        m.limiterOn = true;
        m.limiterCeilingDb = -1.0f;
        m.masterDb = 6.0f;
        s.setMaster (m);
        auto p = padWith (sine (44100, 100.0f, 44100.0, 1.0f));
        p.gain = 1.5f;
        s.setPad (0, p);
        auto out = renderBlocks (s, notes ({ juce::MidiMessage::noteOn (1, 36, (juce::uint8) 127) }), 40);
        const float pk = out.getMagnitude (0, 4096, out.getNumSamples() - 4096);
        CHECK (pk <= juce::Decibels::decibelsToGain (-1.0f) * 1.02f, "peak " + juce::String (pk));
        CHECK (pk > 0.5f, "still loud");
    });

    // ---- Neural Tone ---------------------------------------------------------------------
    run ("rate converter: 44.1 kHz -> 48 kHz -> 44.1 kHz keeps the pitch", []
    {
        kbk::RateConverter up, down;
        up.prepare (44100.0, 48000.0, 512);
        down.prepare (48000.0, 44100.0, 600);
        std::vector<float> zeros (64, 0.0f);
        down.push (zeros.data(), (int) zeros.size());
        auto in = sine (44100, 441.0f, 44100.0);
        juce::AudioBuffer<float> out (1, 44100);
        out.clear();
        std::vector<float> mid (1200), o (512);
        for (int pos = 0; pos + 512 <= 44100; pos += 512)
        {
            up.push (in.getReadPointer (0) + pos, 512);
            const int m = up.available();
            up.pull (mid.data(), m);
            down.push (mid.data(), m);
            const int r = juce::jmin (512, down.available());
            down.pull (o.data(), r);
            CHECK (r == 512, "output keeps up: " + juce::String (r));
            out.copyFrom (0, pos, o.data(), r);
        }
        const int z = zeroCrossings (out, 4410, 4410 + 22050);
        CHECK (std::abs (z - 441) <= 3, "441 Hz -> 441 crossings in 0.5 s, got " + juce::String (z));
    });

    for (auto* modelName : { "wavenet_a1_standard.nam", "lstm.nam", "A2.nam" })
    {
        run ((juce::String ("neural tone: plays through ") + modelName).toRawUTF8(), [modelName]
        {
            const auto json = juce::File (NAM_EXAMPLE_MODELS).getChildFile (modelName).loadFileAsString().toStdString();
            CHECK (! json.empty(), "example model found");
            std::shared_ptr<nam::DSP> model;
            const auto err = kbk::NeuralTone::loadModel (json, 44100.0, 512, model);
            CHECK (err.empty() && model != nullptr, juce::String (err));
            if (model == nullptr)
                return;
            kbk::NeuralTone tone;
            tone.prepare (44100.0, 512);
            tone.setModel (model);
            CHECK (tone.hasModel(), "model in");
            auto in = sine (512 * 40, 220.0f, 44100.0, 0.3f, 2);
            auto dry = in;
            kbk::NeuralSettings s;
            s.on = true;
            for (int pos = 0; pos < in.getNumSamples(); pos += 512)
                tone.process (in.getWritePointer (0) + pos, in.getWritePointer (1) + pos, 512, s);
            bool finite = true;
            for (int i = 0; i < in.getNumSamples(); ++i)
                finite = finite && std::isfinite (in.getSample (0, i));
            CHECK (finite, "no NaN/inf");
            const float rms = in.getRMSLevel (0, 8192, in.getNumSamples() - 8192);
            CHECK (rms > 0.005f, "sound comes out: rms " + juce::String (rms));
            float diff = 0.0f;
            for (int i = 8192; i < in.getNumSamples(); ++i)
                diff = juce::jmax (diff, std::abs (in.getSample (0, i) - dry.getSample (0, i)));
            CHECK (diff > 0.01f, "the amp changes the sound");
            // mix 0 = untouched
            auto again = dry;
            s.mix = 0.0f;
            kbk::NeuralTone dryTone;
            dryTone.prepare (44100.0, 512);
            std::shared_ptr<nam::DSP> m2;
            kbk::NeuralTone::loadModel (json, 44100.0, 512, m2);
            dryTone.setModel (m2);
            // the mix is smoothed over 30 ms, so start it at 0 by processing silence first
            juce::AudioBuffer<float> warm (2, 512 * 8);
            warm.clear();
            for (int pos = 0; pos < warm.getNumSamples(); pos += 512)
                dryTone.process (warm.getWritePointer (0) + pos, warm.getWritePointer (1) + pos, 512, s);
            for (int pos = 0; pos < again.getNumSamples(); pos += 512)
                dryTone.process (again.getWritePointer (0) + pos, again.getWritePointer (1) + pos, 512, s);
            float d2 = 0.0f;
            for (int i = 0; i < again.getNumSamples(); ++i)
                d2 = juce::jmax (d2, std::abs (again.getSample (0, i) - dry.getSample (0, i)));
            CHECK (d2 < 1e-5f, "mix 0 leaves the sound alone: " + juce::String (d2));
        });
    }

    run ("neural tone: a bad file is refused with a message, off = untouched", []
    {
        std::shared_ptr<nam::DSP> model;
        const auto err = kbk::NeuralTone::loadModel ("{\"not\": \"a model\"}", 44100.0, 512, model);
        CHECK (! err.empty() && model == nullptr, "refused");
        const auto err2 = kbk::NeuralTone::loadModel ("this is not json", 44100.0, 512, model);
        CHECK (! err2.empty(), "not json");
        kbk::NeuralTone tone;
        tone.prepare (44100.0, 512);
        auto in = sine (512, 220.0f, 44100.0, 0.3f, 2);
        auto ref = in;
        kbk::NeuralSettings s; // off
        tone.process (in.getWritePointer (0), in.getWritePointer (1), 512, s);
        CHECK (in.getSample (0, 100) == ref.getSample (0, 100), "off");
    });

    run ("neural tone: a WaveNet amp runs faster than real time", []
    {
        const auto json = juce::File (NAM_EXAMPLE_MODELS).getChildFile ("wavenet_a1_standard.nam").loadFileAsString().toStdString();
        std::shared_ptr<nam::DSP> model;
        const auto err = kbk::NeuralTone::loadModel (json, 44100.0, 512, model);
        CHECK (err.empty() && model != nullptr, "model loads: " + juce::String (err));
        if (model == nullptr)
            return;
        kbk::NeuralTone tone;
        tone.prepare (44100.0, 512);
        tone.setModel (model);
        kbk::NeuralSettings s;
        s.on = true;
        juce::AudioBuffer<float> b (2, 512);
        const auto t0 = juce::Time::getMillisecondCounterHiRes();
        const int blocks = 44100 * 5 / 512; // 5 seconds of audio
        for (int k = 0; k < blocks; ++k)
        {
            for (int i = 0; i < 512; ++i)
                b.setSample (0, i, 0.2f * std::sin ((float) (k * 512 + i) * 0.03f)), b.setSample (1, i, b.getSample (0, i));
            tone.process (b.getWritePointer (0), b.getWritePointer (1), 512, s);
        }
        const double ms = juce::Time::getMillisecondCounterHiRes() - t0;
        std::printf ("    5 s of audio through the standard WaveNet amp took %.0f ms (%.1f%% of real time)\n", ms, ms / 50.0);
        CHECK (ms < 5000.0, "faster than real time");
    });

    std::printf ("\n%d checks, %d failed\n", checks, failures);
    return failures == 0 ? 0 : 1;
}
