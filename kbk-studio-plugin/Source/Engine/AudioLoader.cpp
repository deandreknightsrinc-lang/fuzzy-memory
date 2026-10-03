#include "AudioLoader.h"

namespace kbk
{
namespace
{
const juce::StringArray pageHosts { "youtube.com", "youtu.be", "music.youtube.com", "soundcloud.com", "on.soundcloud.com",
                                    "tiktok.com", "instagram.com", "facebook.com", "fb.watch", "x.com", "twitter.com",
                                    "vimeo.com", "bandcamp.com", "mixcloud.com", "audiomack.com", "twitch.tv",
                                    "dailymotion.com", "reddit.com", "v.redd.it" };
const juce::StringArray drmHosts { "spotify.com", "open.spotify.com", "music.apple.com", "tidal.com", "deezer.com", "music.amazon.com" };

bool hostIs (const juce::String& host, const juce::StringArray& list)
{
    for (auto& h : list)
        if (host == h || host.endsWith ("." + h))
            return true;
    return false;
}

bool hasAudioExtension (const juce::String& path)
{
    static const juce::StringArray ext { ".wav", ".wave", ".mp3", ".ogg", ".oga", ".opus", ".flac", ".m4a", ".aac", ".aif",
                                         ".aiff", ".aifc", ".caf", ".weba", ".webm", ".mp4", ".m4v", ".mov", ".3gp" };
    const auto p = path.toLowerCase();
    for (auto& e : ext)
        if (p.endsWith (e))
            return true;
    return false;
}

juce::String setQuery (const juce::String& url, const juce::String& key, const juce::String& value)
{
    // drop an existing key=..., then append key=value
    auto base = url.upToFirstOccurrenceOf ("#", false, false);
    auto path = base.upToFirstOccurrenceOf ("?", false, false);
    auto query = base.fromFirstOccurrenceOf ("?", false, false);
    juce::StringArray parts;
    parts.addTokens (query, "&", "");
    parts.removeEmptyStrings();
    for (int i = parts.size(); --i >= 0;)
        if (parts[i].upToFirstOccurrenceOf ("=", false, false) == key)
            parts.remove (i);
    parts.add (key + "=" + value);
    return path + "?" + parts.joinIntoString ("&");
}
} // namespace

LinkInfo normalizeLink (const juce::String& input)
{
    LinkInfo info;
    auto raw = input.trim();
    if (raw.isEmpty())
    {
        info.note = "Paste a link first.";
        return info;
    }
    if (! raw.containsIgnoreCase ("://"))
    {
        if (raw.containsChar ('.') && ! raw.containsChar (' '))
            raw = "https://" + raw;
        else
        {
            info.note = "That does not look like a web link.";
            return info;
        }
    }
    if (! raw.startsWithIgnoreCase ("http://") && ! raw.startsWithIgnoreCase ("https://"))
    {
        info.note = "Only http:// and https:// links can be read.";
        return info;
    }
    const auto afterScheme = raw.fromFirstOccurrenceOf ("://", false, false);
    auto host = afterScheme.upToFirstOccurrenceOf ("/", false, false).upToFirstOccurrenceOf ("?", false, false)
                    .upToFirstOccurrenceOf (":", false, false).toLowerCase();
    if (host.startsWith ("www."))
        host = host.substring (4);
    info.host = host;
    auto path = ("/" + afterScheme.fromFirstOccurrenceOf ("/", false, false)).upToFirstOccurrenceOf ("?", false, false).upToFirstOccurrenceOf ("#", false, false);
    juce::String url = raw;

    if (hostIs (host, drmHosts))
    {
        info.kind = LinkInfo::Kind::Drm;
        info.url = url;
        info.note = "Streaming services lock their audio (DRM), so it cannot be pulled from a link. Use a file you own instead.";
        return info;
    }
    if ((host == "dropbox.com" || host.endsWith (".dropbox.com")) && host != "dl.dropboxusercontent.com")
    {
        auto u = url;
        // remove dl=..., add raw=1
        auto base = u.upToFirstOccurrenceOf ("?", false, false);
        auto query = u.fromFirstOccurrenceOf ("?", false, false);
        juce::StringArray parts;
        parts.addTokens (query, "&", "");
        parts.removeEmptyStrings();
        for (int i = parts.size(); --i >= 0;)
            if (parts[i].startsWith ("dl="))
                parts.remove (i);
        url = parts.isEmpty() ? base : base + "?" + parts.joinIntoString ("&");
        url = setQuery (url, "raw", "1");
        info.note = "Dropbox share link changed to the direct file.";
    }
    if (host == "drive.google.com")
    {
        juce::String id;
        if (path.startsWith ("/file/d/"))
            id = path.fromFirstOccurrenceOf ("/file/d/", false, false).upToFirstOccurrenceOf ("/", false, false);
        else if (url.contains ("id="))
            id = url.fromFirstOccurrenceOf ("id=", false, false).upToFirstOccurrenceOf ("&", false, false);
        if (id.isNotEmpty())
        {
            info.kind = LinkInfo::Kind::Helper;
            info.url = "https://drive.google.com/uc?export=download&id=" + id;
            info.note = "Google Drive share link changed to the direct download.";
            return info;
        }
    }
    if (host == "github.com")
    {
        juce::StringArray seg;
        seg.addTokens (path, "/", "");
        seg.removeEmptyStrings();
        if (seg.size() > 3 && (seg[2] == "blob" || seg[2] == "raw"))
        {
            juce::StringArray rest;
            for (int i = 3; i < seg.size(); ++i)
                rest.add (seg[i]);
            url = "https://raw.githubusercontent.com/" + seg[0] + "/" + seg[1] + "/" + rest.joinIntoString ("/");
            path = "/" + rest.joinIntoString ("/");
            info.note = "GitHub page link changed to the raw file.";
        }
    }
    if (host == "1drv.ms" || host.endsWith ("onedrive.live.com") || host.endsWith ("sharepoint.com"))
    {
        url = setQuery (url, "download", "1");
        info.note = "OneDrive link changed to download the file.";
    }
    info.url = url;
    if (hostIs (host, pageHosts))
    {
        info.kind = LinkInfo::Kind::Page;
        if (info.note.isEmpty())
            info.note = "This is a video/music page, not an audio file. The KBK helper pulls the audio out of it.";
        return info;
    }
    info.kind = hasAudioExtension (path) ? LinkInfo::Kind::Direct : LinkInfo::Kind::Unknown;
    return info;
}

juce::String sniff (const juce::MemoryBlock& bytes)
{
    const auto* b = static_cast<const unsigned char*> (bytes.getData());
    const size_t n = bytes.getSize();
    if (n < 4)
        return "empty";
    auto is = [&] (size_t off, const char* s)
    {
        const size_t len = strlen (s);
        return n >= off + len && memcmp (b + off, s, len) == 0;
    };
    if (is (0, "RIFF") && is (8, "WAVE"))
        return "wav";
    if (is (0, "FORM") && (is (8, "AIFF") || is (8, "AIFC")))
        return "aiff";
    if (is (0, "ID3") || (b[0] == 0xff && (b[1] & 0xe0) == 0xe0))
        return "mp3";
    if (is (0, "OggS"))
        return "ogg";
    if (is (0, "fLaC"))
        return "flac";
    if (is (4, "ftyp"))
        return "mp4";
    if (is (0, "caff"))
        return "caf";
    if (b[0] == 0x1a && b[1] == 0x45 && b[2] == 0xdf && b[3] == 0xa3)
        return "webm";
    size_t i = 0;
    while (i < n && i < 64 && (b[i] == ' ' || b[i] == '\n' || b[i] == '\r' || b[i] == '\t'))
        ++i;
    if (i < n && (b[i] == '<' || b[i] == '{' || b[i] == '['))
        return "html";
    return "unknown";
}

juce::String nameFromUrl (const juce::String& url)
{
    if (url.contains ("v="))
        return "youtube-" + url.fromFirstOccurrenceOf ("v=", false, false).upToFirstOccurrenceOf ("&", false, false);
    auto path = url.fromFirstOccurrenceOf ("://", false, false).fromFirstOccurrenceOf ("/", false, false)
                    .upToFirstOccurrenceOf ("?", false, false).upToFirstOccurrenceOf ("#", false, false);
    auto last = juce::URL::removeEscapeChars (path.fromLastOccurrenceOf ("/", false, false));
    if (last.containsChar ('.'))
        last = last.upToLastOccurrenceOf (".", false, false);
    return last.isNotEmpty() ? last : juce::String ("audio");
}

// ---------------------------------------------------------------------------

AudioLoader::AudioLoader()
{
    formats.registerBasicFormats();
}

LoadedAudio AudioLoader::decode (const juce::MemoryBlock& bytes, const juce::String& name, bool allowHelper)
{
    LoadedAudio res;
    res.name = name;
    const auto kind = sniff (bytes);
    if (kind == "html")
    {
        res.error = "That is a web page, not an audio file.";
        return res;
    }
    if (kind == "empty")
    {
        res.error = "The file is empty.";
        return res;
    }
    std::unique_ptr<juce::AudioFormatReader> reader (
        formats.createReaderFor (std::make_unique<juce::MemoryInputStream> (bytes, false)));
    if (reader == nullptr && allowHelper && helperOnline())
    {
        // ffmpeg on the helper opens anything
        juce::MemoryBlock wav;
        juce::String err;
        // query kept in the address: JUCE would otherwise move it into the POST body
        auto url = juce::URL::createWithoutParsing (helperBase + "/convert?format=wav").withPOSTData (bytes);
        if (download (url, wav, err, 10 * 60 * 1000))
            reader.reset (formats.createReaderFor (std::make_unique<juce::MemoryInputStream> (wav, true)));
    }
    if (reader == nullptr)
    {
        res.error = "Can't open this " + (kind == "unknown" ? juce::String() : kind.toUpperCase() + " ")
                    + "file. Start the KBK helper to open any format.";
        return res;
    }
    const auto frames = (int) juce::jmin<juce::int64> (reader->lengthInSamples, (juce::int64) (maxSeconds * reader->sampleRate));
    const int chans = (int) juce::jlimit<unsigned int> (1u, 2u, reader->numChannels);
    res.audio.setSize (chans, juce::jmax (1, frames));
    res.audio.clear();
    reader->read (&res.audio, 0, frames, 0, true, chans > 1);
    res.sampleRate = reader->sampleRate;
    if (frames <= 0)
        res.error = "The file has no audio in it.";
    return res;
}

LoadedAudio AudioLoader::loadFile (const juce::File& file)
{
    juce::MemoryBlock bytes;
    if (! file.loadFileAsData (bytes))
    {
        LoadedAudio r;
        r.error = "Couldn't read " + file.getFileName();
        return r;
    }
    return decode (bytes, file.getFileNameWithoutExtension());
}

bool AudioLoader::download (const juce::URL& url, juce::MemoryBlock& out, juce::String& error, int timeoutMs, juce::String* fileName)
{
    int status = 0;
    juce::StringPairArray headers;
    auto opts = juce::URL::InputStreamOptions (url.getPostDataAsMemoryBlock().getSize() > 0 ? juce::URL::ParameterHandling::inPostData
                                                                                : juce::URL::ParameterHandling::inAddress)
                    .withConnectionTimeoutMs (timeoutMs)
                    .withStatusCode (&status)
                    .withResponseHeaders (&headers)
                    .withNumRedirectsToFollow (8)
                    .withExtraHeaders ("User-Agent: Mozilla/5.0 (Macintosh) KBKStudio");
    auto stream = url.createInputStream (opts);
    if (stream == nullptr)
    {
        error = "couldn't connect";
        return false;
    }
    out.reset();
    juce::MemoryOutputStream mo (out, false);
    const juce::int64 limit = 600LL * 1024 * 1024;
    char buf[65536];
    while (! stream->isExhausted())
    {
        if (cancelled)
        {
            error = "cancelled";
            return false;
        }
        const int got = stream->read (buf, sizeof (buf));
        if (got <= 0)
            break;
        mo.write (buf, (size_t) got);
        if ((juce::int64) mo.getDataSize() > limit)
        {
            error = "the file is over 600 MB";
            return false;
        }
    }
    mo.flush();
    if (status >= 400)
    {
        // the helper explains itself in JSON: {"error": "..."}
        auto text = out.toString();
        auto j = juce::JSON::parse (text);
        error = j.isObject() && j.hasProperty ("error") ? j["error"].toString() : "the site answered " + juce::String (status);
        return false;
    }
    if (fileName != nullptr)
    {
        auto cd = headers.getValue ("Content-Disposition", {});
        if (cd.isEmpty())
            cd = headers.getValue ("content-disposition", {});
        if (cd.contains ("filename=\""))
            *fileName = cd.fromFirstOccurrenceOf ("filename=\"", false, false).upToFirstOccurrenceOf ("\"", false, false);
    }
    return true;
}

bool AudioLoader::helperOnline()
{
    juce::MemoryBlock mb;
    juce::String err;
    return download (juce::URL (helperBase + "/health"), mb, err, 1500) && mb.toString().contains ("\"ok\"");
}

juce::var AudioLoader::listVoices (juce::String& error)
{
    juce::MemoryBlock mb;
    if (! download (juce::URL (helperBase + "/voices"), mb, error, 4000))
    {
        if (error == "couldn't connect")
            error = "The KBK helper isn't running. In Terminal: bash ~/fuzzy-memory/kbk-studio/server/start-helper.sh";
        return {};
    }
    return juce::JSON::parse (mb.toString());
}

LoadedAudio AudioLoader::convertVoice (const juce::AudioBuffer<float>& audio, double sampleRate, const juce::String& voice, int pitch,
                                       const juce::String& name)
{
    LoadedAudio res;
    juce::MemoryBlock wav;
    {
        juce::WavAudioFormat fmt;
        std::unique_ptr<juce::OutputStream> os = std::make_unique<juce::MemoryOutputStream> (wav, false);
        auto w = fmt.createWriterFor (os, juce::AudioFormatWriterOptions {}.withSampleRate (sampleRate)
                                              .withNumChannels (audio.getNumChannels())
                                              .withBitsPerSample (24));
        if (w == nullptr)
        {
            res.error = "Couldn't prepare the audio.";
            return res;
        }
        w->writeFromAudioSampleBuffer (audio, 0, audio.getNumSamples());
    }
    // query kept in the address: JUCE would otherwise move it into the POST body
    auto url = juce::URL::createWithoutParsing (helperBase + "/vox?voice=" + juce::URL::addEscapeChars (voice, true)
                                                + "&pitch=" + juce::String (pitch))
                   .withPOSTData (wav);
    juce::MemoryBlock out;
    juce::String err;
    if (! download (url, out, err, 30 * 60 * 1000))
    {
        res.error = err == "couldn't connect"
                        ? juce::String ("The KBK helper isn't running. In Terminal: bash ~/fuzzy-memory/kbk-studio/server/start-helper.sh")
                        : "AI Vox didn't work: " + err;
        return res;
    }
    return decode (out, name, false);
}

juce::String AudioLoader::polishPrompt (const juce::String& facts, const juce::String& draft, juce::String& source)
{
    auto* obj = new juce::DynamicObject();
    obj->setProperty ("facts", facts);
    obj->setProperty ("draft", draft);
    const auto body = juce::JSON::toString (juce::var (obj), true);
    auto url = juce::URL::createWithoutParsing (helperBase + "/suno").withPOSTData (body);
    juce::MemoryBlock out;
    juce::String err;
    if (! download (url, out, err, 120 * 1000))
        return {};
    auto j = juce::JSON::parse (out.toString());
    source = j["source"].toString();
    return j["prompt"].toString().trim();
}

LoadedAudio AudioLoader::loadUrl (const juce::String& input, std::function<void (const juce::String&)> progress)
{
    LoadedAudio res;
    auto say = [&] (const juce::String& s) { if (progress) progress (s); };
    const auto info = normalizeLink (input);
    if (info.url.isEmpty() || info.kind == LinkInfo::Kind::Drm)
    {
        res.error = info.note;
        return res;
    }
    if (info.note.isNotEmpty())
        say (info.note);
    auto name = nameFromUrl (info.url);
    juce::MemoryBlock bytes;
    juce::String why;

    if (info.kind == LinkInfo::Kind::Direct || info.kind == LinkInfo::Kind::Unknown)
    {
        say ("Downloading...");
        juce::String err;
        if (download (juce::URL (info.url), bytes, err, 30000))
        {
            if (sniff (bytes) == "html")
            {
                bytes.reset();
                why = "The link opened a web page instead of an audio file.";
            }
        }
        else
        {
            bytes.reset();
            why = "Couldn't download it directly (" + err + ").";
        }
    }
    else
        why = info.note;

    if (bytes.isEmpty())
    {
        say (why + " Asking the KBK helper...");
        if (! helperOnline())
        {
            res.error = why + " This link needs the KBK helper, and it isn't running. In Terminal: bash ~/fuzzy-memory/kbk-studio/server/start-helper.sh";
            return res;
        }
        say ("The KBK helper is fetching the audio (a long video takes a minute)...");
        juce::String err, fname;
        if (! download (juce::URL (helperBase + "/fetch").withParameter ("url", info.url), bytes, err, 30 * 60 * 1000, &fname))
        {
            res.error = "The helper couldn't get it: " + err;
            return res;
        }
        if (fname.isNotEmpty())
            name = fname.upToLastOccurrenceOf (".", false, false);
    }
    say ("Got " + juce::String ((double) bytes.getSize() / 1048576.0, 1) + " MB. Decoding...");
    return decode (bytes, name);
}
} // namespace kbk
