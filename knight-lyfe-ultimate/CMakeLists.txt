cmake_minimum_required(VERSION 3.22)

# Universal binary on Mac (Apple Silicon + Intel), macOS 11 and later.
# These must be set before project() to take effect.
set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "Mac architectures")
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version")

project(KnightLyfeUltimate VERSION 0.1.0 LANGUAGES C CXX)

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

# ---- Embedded assets --------------------------------------------------------
# The Knight Keys web app is the plug-in's interface, and the Salamander piano
# samples feed the C++ engine. Both are zipped into the binary at build time.
set(KK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../knight-keys)
file(GLOB KK_JS CONFIGURE_DEPENDS RELATIVE ${KK_DIR} ${KK_DIR}/js/*.js)
file(GLOB KK_VENDOR CONFIGURE_DEPENDS RELATIVE ${KK_DIR} ${KK_DIR}/vendor/basic-pitch/* ${KK_DIR}/vendor/osmd/*)
set(KK_WEB_FILES index.html styles.css ${KK_JS} ${KK_VENDOR})
file(GLOB KK_SAMPLES CONFIGURE_DEPENDS RELATIVE ${KK_DIR} ${KK_DIR}/samples/salamander/*.mp3)

set(ASSET_DIR ${CMAKE_CURRENT_BINARY_DIR}/assets)
file(MAKE_DIRECTORY ${ASSET_DIR})
list(TRANSFORM KK_WEB_FILES PREPEND ${KK_DIR}/ OUTPUT_VARIABLE KK_WEB_DEPS)
list(TRANSFORM KK_SAMPLES PREPEND ${KK_DIR}/ OUTPUT_VARIABLE KK_SAMPLE_DEPS)

add_custom_command(OUTPUT ${ASSET_DIR}/web.zip
    COMMAND ${CMAKE_COMMAND} -E tar cf ${ASSET_DIR}/web.zip --format=zip ${KK_WEB_FILES}
    WORKING_DIRECTORY ${KK_DIR}
    DEPENDS ${KK_WEB_DEPS}
    COMMENT "Packing the Knight Keys interface")
add_custom_command(OUTPUT ${ASSET_DIR}/piano.zip
    COMMAND ${CMAKE_COMMAND} -E tar cf ${ASSET_DIR}/piano.zip --format=zip ${KK_SAMPLES}
    WORKING_DIRECTORY ${KK_DIR}
    DEPENDS ${KK_SAMPLE_DEPS}
    COMMENT "Packing the piano samples")
add_custom_target(KnightLyfeAssetZips DEPENDS ${ASSET_DIR}/web.zip ${ASSET_DIR}/piano.zip)

juce_add_binary_data(KnightLyfeAssets
    HEADER_NAME KnightLyfeAssets.h
    NAMESPACE KnightLyfeAssets
    SOURCES ${ASSET_DIR}/web.zip ${ASSET_DIR}/piano.zip)
add_dependencies(KnightLyfeAssets KnightLyfeAssetZips)

# ---- Audio engine (shared by the plug-in and the tests) ----------------------
set(ENGINE_SOURCES
    Source/Engine/PianoEngine.cpp
    Source/Engine/DrumSynth.cpp
    Source/Engine/SoundEngine.cpp)

# ---- Plug-in + standalone app ------------------------------------------------
juce_add_plugin(KnightLyfeUltimate
    COMPANY_NAME "Knight Lyfe"
    COMPANY_WEBSITE "https://deandreknightsrinc-lang.github.io/fuzzy-memory/"
    BUNDLE_ID com.knightlyfe.ultimate
    PRODUCT_NAME "Knight Lyfe Ultimate"
    DESCRIPTION "Learning studio and grand piano: chords, score, songs and learn mode"
    PLUGIN_MANUFACTURER_CODE Klyf
    PLUGIN_CODE Kkey
    FORMATS AU VST3 Standalone
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    NEEDS_WEB_BROWSER TRUE
    AU_MAIN_TYPE kAudioUnitType_MusicDevice
    VST3_CATEGORIES Instrument Piano
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(KnightLyfeUltimate PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/WebAssets.cpp
    ${ENGINE_SOURCES})

target_include_directories(KnightLyfeUltimate PRIVATE Source)

target_compile_definitions(KnightLyfeUltimate PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_USE_MP3AUDIOFORMAT=1
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0)

target_link_libraries(KnightLyfeUltimate
    PRIVATE
        KnightLyfeAssets
        juce::juce_audio_utils
        juce::juce_audio_formats
        juce::juce_dsp
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)

# ---- Engine tests (renders notes offline and checks the output) --------------
option(KNIGHT_LYFE_TESTS "Build the engine tests" ON)
if(KNIGHT_LYFE_TESTS)
    juce_add_console_app(KnightLyfeEngineTests PRODUCT_NAME "KnightLyfeEngineTests")
    target_sources(KnightLyfeEngineTests PRIVATE Tests/EngineTests.cpp ${ENGINE_SOURCES})
    target_include_directories(KnightLyfeEngineTests PRIVATE Source)
    target_compile_definitions(KnightLyfeEngineTests PRIVATE
        JUCE_USE_CURL=0 JUCE_WEB_BROWSER=0 JUCE_USE_MP3AUDIOFORMAT=1)
    target_link_libraries(KnightLyfeEngineTests PRIVATE
        KnightLyfeAssets
        juce::juce_audio_formats
        juce::juce_audio_basics
        juce::juce_dsp
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
endif()
