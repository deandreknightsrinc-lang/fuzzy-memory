# Offline DSP tests: compiles both processors (without the plugin wrappers) into one console app.
juce_add_console_app(WompTests PRODUCT_NAME "WompTests")

target_sources(WompTests PRIVATE
    WompTests.cpp
    ${CMAKE_SOURCE_DIR}/WompLowEnd/Source/LowEndProcessor.cpp
    ${CMAKE_SOURCE_DIR}/WompLowEnd/Source/LowEndEditor.cpp
    ${CMAKE_SOURCE_DIR}/WompDust/Source/DustProcessor.cpp
    ${CMAKE_SOURCE_DIR}/WompDust/Source/DustEditor.cpp)

target_include_directories(WompTests PRIVATE
    ${CMAKE_SOURCE_DIR}/WompLowEnd/Source
    ${CMAKE_SOURCE_DIR}/WompDust/Source)

target_compile_definitions(WompTests PRIVATE
    ${WOMP_JUCE_DEFINITIONS}
    WOMP_TEST_BUILD=1
    JUCE_STANDALONE_APPLICATION=1)

target_link_libraries(WompTests
    PRIVATE
        womp_shared
        juce::juce_audio_processors
        juce::juce_dsp
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)

add_test(NAME WompDSPTests COMMAND WompTests)
set_tests_properties(WompDSPTests PROPERTIES TIMEOUT 300)
