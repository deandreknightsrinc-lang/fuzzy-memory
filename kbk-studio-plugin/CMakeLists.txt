cmake_minimum_required(VERSION 3.22)

# Universal binary on Mac (Apple Silicon + Intel), macOS 11 and later.
# These must be set before project() to take effect.
set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "Mac architectures")
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version")

project(KBKStudio VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20) # the NAM engine needs C++20
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

# ---- Neural Amp Modeler engine (Neural Tone) ---------------------------------
# NeuralAmpModelerCore (MIT) with Eigen (MPL-2.0) and nlohmann/json (MIT).
# Use a local checkout with -DNAM_DIR=/path/to/NeuralAmpModelerCore.
set(NAM_DIR "" CACHE PATH "Path to a NeuralAmpModelerCore checkout (optional)")
if(NOT NAM_DIR)
    include(FetchContent)
    FetchContent_Declare(nam
        GIT_REPOSITORY https://github.com/sdatkinson/NeuralAmpModelerCore.git
        GIT_TAG v0.6.0
        GIT_SHALLOW TRUE
        GIT_SUBMODULES Dependencies/eigen
        SOURCE_SUBDIR do-not-add) # only the sources: we build them below
    FetchContent_MakeAvailable(nam)
    set(NAM_DIR ${nam_SOURCE_DIR})
endif()
file(GLOB NAM_SOURCES CONFIGURE_DEPENDS ${NAM_DIR}/NAM/*.cpp ${NAM_DIR}/NAM/*/*.cpp)
# OBJECT, not STATIC: NAM registers its model types (WaveNet, LSTM...) from static
# initialisers that a static library would drop.
add_library(nam_core OBJECT ${NAM_SOURCES})
target_include_directories(nam_core SYSTEM PUBLIC
    ${NAM_DIR}
    ${NAM_DIR}/Dependencies/eigen
    ${NAM_DIR}/Dependencies/nlohmann)
target_compile_definitions(nam_core PUBLIC NAM_SAMPLE_FLOAT NAM_ENABLE_A2_FAST)
set_target_properties(nam_core PROPERTIES POSITION_INDEPENDENT_CODE ON)
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    target_compile_options(nam_core PRIVATE -O3 -w)
endif()

set(ENGINE_SOURCES
    Source/Engine/AutoChop.cpp
    Source/Engine/PadSampler.cpp
    Source/Engine/AudioLoader.cpp
    Source/Engine/NeuralTone.cpp
    Source/Engine/Analysis.cpp)

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

# NAM goes straight into each format's final link, not into JUCE's shared-code
# static library: from there the linker would drop the model types (WaveNet,
# LSTM...), which register themselves and are never called directly.
target_include_directories(KBKStudio PRIVATE $<TARGET_PROPERTY:nam_core,INTERFACE_INCLUDE_DIRECTORIES>)
target_compile_definitions(KBKStudio PRIVATE $<TARGET_PROPERTY:nam_core,INTERFACE_COMPILE_DEFINITIONS>)
add_dependencies(KBKStudio nam_core)
foreach(format AU VST3 Standalone)
    if(TARGET KBKStudio_${format})
        target_sources(KBKStudio_${format} PRIVATE $<TARGET_OBJECTS:nam_core>)
    endif()
endforeach()

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
        NAM_EXAMPLE_MODELS="${NAM_DIR}/example_models"
        JUCE_USE_CURL=${KBK_USE_CURL} JUCE_WEB_BROWSER=0 JUCE_USE_MP3AUDIOFORMAT=1 JUCE_USE_FLAC=1 JUCE_USE_OGGVORBIS=1)
    target_link_libraries(KBKStudioTests PRIVATE
        nam_core
        juce::juce_audio_formats
        juce::juce_audio_basics
        juce::juce_dsp
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
endif()
