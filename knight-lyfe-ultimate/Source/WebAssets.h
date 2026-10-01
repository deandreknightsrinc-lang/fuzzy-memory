#pragma once

#include <juce_gui_extra/juce_gui_extra.h>

/** Serves the Knight Keys interface (zipped into the binary) to the WebBrowserComponent. */
class WebAssets
{
public:
    WebAssets();

    std::optional<juce::WebBrowserComponent::Resource> get (const juce::String& url);

    static juce::String mimeTypeFor (const juce::String& path);
    /** Rewrites non-ASCII characters as HTML, JavaScript or CSS escapes. */
    static juce::String toAscii (const juce::String& text, const juce::String& ext);

private:
    juce::ZipFile zip;
};
