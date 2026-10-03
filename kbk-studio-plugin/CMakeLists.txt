cmake_minimum_required(VERSION 3.22)

# Universal binary on Mac (Apple Silicon + Intel), macOS 11 and later.
# These must be set before project() to take effect.
set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "Mac architectures")
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version")

project(KBKStudio VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# JUCE: use a local checkout with -DJUCE_DIR=/path/to/JUCE, otherwise download it.
set(JUCE_DIR "" CACHE PATH "Path to a JUCE checkout (optional)")
if(JUCE_DIR)
    add_subdirectory(${JUCE_DIR} juce)
else()
    include(FetchContent)
    FetchContent_Declare(juce
        GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
        GIT_TAG 8.0.15
        GIT_SHALLOW TRUE)
    FetchContent_MakeAvailable(juce)
endif()

set(ENGINE_SOURCES
    Source/Engine/AutoChop.cpp
    Source/Engine/PadSampler.cpp
    Source/Engine/AudioLoader.cpp)

# Network reads use the system on Mac (NSURLSession); Linux builds need curl.
if(APPLE)
    set(KBK_USE_CURL 0)
else()
    set(KBK_USE_CURL 1)
endif()

# ---- Plug-in + standalone app ------------------------------------------------
# Named "KBK Studio 2" so it installs next to an older "KBK Studio" plug-in
# instead of replacing it.
juce_add_plugin(KBKStudio
    COMPANY_NAME "Knight Lyfe"
    COMPANY_WEBSITE "https://deandreknightsrinc-lang.github.io/fuzzy-memory/kbk-studio/"
    BUNDLE_ID com.knightlyfe.kbkstudio2
    PRODUCT_NAME "KBK Studio 2"
    DESCRIPTION "16-pad sampler with auto-chop, links and master bus"
    PLUGIN_MANUFACTURER_CODE Klyf
    PLUGIN_CODE Kbk2
    FORMATS AU VST3 Standalone
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    AU_MAIN_TYPE kAudioUnitType_MusicDevice
    VST3_CATEGORIES Instrument Sampler Drum
    NEEDS_CURL ${KBK_USE_CURL}
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(KBKStudio PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    ${ENGINE_SOURCES})

target_include_directories(KBKStudio PRIVATE Source)

target_compile_definitions(KBKStudio PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=${KBK_USE_CURL}
    JUCE_USE_MP3AUDIOFORMAT=1
    JUCE_USE_FLAC=1
    JUCE_USE_OGGVORBIS=1
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0)

target_link_libraries(KBKStudio
    PRIVATE
        juce::juce_audio_utils
        juce::juce_audio_formats
        juce::juce_dsp
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)

# ---- Engine tests (renders pads offline and checks the output) ---------------
option(KBK_TESTS "Build the engine tests" ON)
if(KBK_TESTS)
    juce_add_console_app(KBKStudioTests PRODUCT_NAME "KBKStudioTests" NEEDS_CURL ${KBK_USE_CURL})
    target_sources(KBKStudioTests PRIVATE Tests/EngineTests.cpp ${ENGINE_SOURCES})
    target_include_directories(KBKStudioTests PRIVATE Source)
    target_compile_definitions(KBKStudioTests PRIVATE
        JUCE_USE_CURL=${KBK_USE_CURL} JUCE_WEB_BROWSER=0 JUCE_USE_MP3AUDIOFORMAT=1 JUCE_USE_FLAC=1 JUCE_USE_OGGVORBIS=1)
    target_link_libraries(KBKStudioTests PRIVATE
        juce::juce_audio_formats
        juce::juce_audio_basics
        juce::juce_dsp
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
endif()
