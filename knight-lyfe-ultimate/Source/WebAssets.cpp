#include "WebAssets.h"
#include "KnightLyfeAssets.h"

WebAssets::WebAssets()
    : zip (std::make_unique<juce::MemoryInputStream> (KnightLyfeAssets::web_zip, (size_t) KnightLyfeAssets::web_zipSize, false))
{
}

juce::String WebAssets::mimeTypeFor (const juce::String& path)
{
    const auto ext = path.fromLastOccurrenceOf (".", false, false).toLowerCase();
    // Text types say UTF-8 explicitly so symbols (♯ ♭ → …) and emoji render correctly.
    if (ext == "html") return "text/html; charset=utf-8";
    if (ext == "js") return "text/javascript; charset=utf-8";
    if (ext == "css") return "text/css; charset=utf-8";
    if (ext == "json") return "application/json; charset=utf-8";
    if (ext == "mp3") return "audio/mpeg";
    if (ext == "svg") return "image/svg+xml";
    if (ext == "png") return "image/png";
    if (ext == "txt") return "text/plain; charset=utf-8";
    return "application/octet-stream";
}

std::optional<juce::WebBrowserComponent::Resource> WebAssets::get (const juce::String& url)
{
    // "/" -> index.html; drop any query string; "/js/main.js" -> "js/main.js"
    auto path = url.upToFirstOccurrenceOf ("?", false, false).trimCharactersAtStart ("/");
    if (path.isEmpty())
        path = "index.html";

    const auto index = zip.getIndexOfFileName (path);
    if (index < 0)
        return std::nullopt;

    std::unique_ptr<juce::InputStream> stream (zip.createStreamForEntry (index));
    if (stream == nullptr)
        return std::nullopt;

    juce::MemoryBlock block;
    stream->readIntoMemoryBlock (block);

    const auto ext = path.fromLastOccurrenceOf (".", false, false).toLowerCase();
    if (ext == "html" || ext == "js" || ext == "css")
    {
        const auto ascii = toAscii (juce::String::fromUTF8 ((const char*) block.getData(), (int) block.getSize()), ext);
        block.replaceAll (ascii.toRawUTF8(), ascii.getNumBytesAsUTF8());
    }

    juce::WebBrowserComponent::Resource resource;
    resource.data.resize (block.getSize());
    std::memcpy (resource.data.data(), block.getData(), block.getSize());
    resource.mimeType = mimeTypeFor (path);
    return resource;
}

juce::String WebAssets::toAscii (const juce::String& text, const juce::String& ext)
{
    // Some web views ignore the charset of app-served files (WebKitGTK reads them as
    // Latin-1). Writing every non-ASCII character as an escape makes the encoding moot:
    // &#N; in HTML, \uXXXX in JavaScript (as UTF-16, so emoji become surrogate pairs),
    // and \XXXXXX in CSS.
    juce::String out;
    out.preallocateBytes (text.getNumBytesAsUTF8() + 64);
    for (auto p = text.getCharPointer(); ! p.isEmpty();)
    {
        const auto c = (juce::uint32) p.getAndAdvance();
        if (c < 0x80)
        {
            out << (juce::juce_wchar) c;
        }
        else if (ext == "html")
        {
            out << "&#" << (int) c << ";";
        }
        else if (ext == "css")
        {
            out << "\\" << juce::String::toHexString ((int) c).paddedLeft ('0', 6);
        }
        else if (c >= 0x10000)
        {
            const auto v = c - 0x10000;
            out << "\\u" << juce::String::toHexString ((int) (0xd800 + (v >> 10))).paddedLeft ('0', 4)
                << "\\u" << juce::String::toHexString ((int) (0xdc00 + (v & 0x3ff))).paddedLeft ('0', 4);
        }
        else
        {
            out << "\\u" << juce::String::toHexString ((int) c).paddedLeft ('0', 4);
        }
    }
    return out;
}
