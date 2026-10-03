#pragma once

#include <juce_audio_formats/juce_audio_formats.h>

// Turns links and files into audio. Same rules as the web app's url-tools.js:
// share links are rewritten to the file, web pages and video sites (YouTube,
// SoundCloud...) go through the KBK helper (kbk-studio/server), which runs
// yt-dlp and ffmpeg on this Mac.
namespace kbk
{
struct LinkInfo
{
    enum class Kind { Direct, Unknown, Page, Helper, Drm };
    Kind kind = Kind::Unknown;
    juce::String url, host, note;
};

// Throws nothing; an empty url means the input wasn't a usable link (see note).
LinkInfo normalizeLink (const juce::String& input);

// What a block of bytes really is: "wav", "aiff", "mp3", "flac", "ogg", "mp4",
// "html", "empty" or "unknown".
juce::String sniff (const juce::MemoryBlock& bytes);

juce::String nameFromUrl (const juce::String& url);

struct LoadedAudio
{
    juce::AudioBuffer<float> audio;
    double sampleRate = 0.0;
    juce::String name, error;
    bool ok() const { return error.isEmpty() && audio.getNumSamples() > 0; }
};

class AudioLoader
{
public:
    AudioLoader();

    juce::String helperBase { "http://127.0.0.1:8765" };

    // Decodes WAV, AIFF, FLAC, OGG, MP3 (and on a Mac anything Core Audio
    // reads: M4A, AAC, ALAC, CAF). Falls back to the helper's ffmpeg.
    LoadedAudio decode (const juce::MemoryBlock& bytes, const juce::String& name, bool allowHelper = true);
    LoadedAudio loadFile (const juce::File& file);

    // Reads any link. `progress` gets plain-language steps. Blocks: call it
    // from a background thread.
    LoadedAudio loadUrl (const juce::String& input, std::function<void (const juce::String&)> progress);

    bool helperOnline();

    // AI Vox: the voice models the helper has ({"folder": ..., "voices": [...], "ready": bool}).
    juce::var listVoices (juce::String& error);
    // Sings/says the audio again in another voice (RVC on the helper). `pitch` in semitones.
    LoadedAudio convertVoice (const juce::AudioBuffer<float>& audio, double sampleRate, const juce::String& voice, int pitch,
                              const juce::String& name);

    // Suno: asks the helper to polish a style prompt with a local AI (Ollama).
    // Returns the prompt, or empty when the helper/AI isn't there; `source` says which.
    juce::String polishPrompt (const juce::String& facts, const juce::String& draft, juce::String& source);

    // set to stop a download that's in progress (the plug-in is closing)
    std::atomic<bool> cancelled { false };

    // longest audio we take (10 minutes at 48 kHz stereo is ~230 MB as floats)
    static constexpr double maxSeconds = 600.0;

private:
    bool download (const juce::URL& url, juce::MemoryBlock& out, juce::String& error, int timeoutMs, juce::String* fileName = nullptr);
    juce::AudioFormatManager formats;
};
} // namespace kbk
