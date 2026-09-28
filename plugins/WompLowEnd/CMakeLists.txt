juce_add_plugin(WompLowEnd
    COMPANY_NAME                "Knight Lyfe"
    COMPANY_WEBSITE             "https://github.com/"
    PLUGIN_MANUFACTURER_CODE    KnLf
    PLUGIN_CODE                 WmLe
    BUNDLE_ID                   com.knightlyfe.wompLowEnd
    PRODUCT_NAME                "WompLowEnd"
    PLUGIN_NAME                 "WOMP Low End"
    DESCRIPTION                 "808 and bass weapon: saturation, sub shelf, mono-below, punch"
    VERSION                     ${PROJECT_VERSION}
    FORMATS                     ${WOMP_FORMATS}
    IS_SYNTH                    FALSE
    NEEDS_MIDI_INPUT            FALSE
    NEEDS_MIDI_OUTPUT           FALSE
    IS_MIDI_EFFECT              FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    AU_MAIN_TYPE                kAudioUnitType_Effect
    VST3_CATEGORIES             Fx Distortion EQ
    COPY_PLUGIN_AFTER_BUILD     ${WOMP_COPY_FLAG})

target_sources(WompLowEnd PRIVATE
    Source/LowEndProcessor.cpp
    Source/LowEndEditor.cpp)

target_include_directories(WompLowEnd PRIVATE Source)

target_compile_definitions(WompLowEnd PUBLIC ${WOMP_JUCE_DEFINITIONS})

target_link_libraries(WompLowEnd
    PRIVATE
        womp_shared
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)
