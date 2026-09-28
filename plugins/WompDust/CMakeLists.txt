juce_add_plugin(WompDust
    COMPANY_NAME                "Knight Lyfe"
    COMPANY_WEBSITE             "https://github.com/"
    PLUGIN_MANUFACTURER_CODE    KnLf
    PLUGIN_CODE                 WmDs
    BUNDLE_ID                   com.knightlyfe.wompDust
    PRODUCT_NAME                "WompDust"
    PLUGIN_NAME                 "WOMP Dust"
    DESCRIPTION                 "Make it sound like a 1976 record: tape, wow, flutter, crackle, hiss"
    VERSION                     ${PROJECT_VERSION}
    FORMATS                     ${WOMP_FORMATS}
    IS_SYNTH                    FALSE
    NEEDS_MIDI_INPUT            FALSE
    NEEDS_MIDI_OUTPUT           FALSE
    IS_MIDI_EFFECT              FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    AU_MAIN_TYPE                kAudioUnitType_Effect
    VST3_CATEGORIES             Fx Distortion Modulation
    COPY_PLUGIN_AFTER_BUILD     ${WOMP_COPY_FLAG})

target_sources(WompDust PRIVATE
    Source/DustProcessor.cpp
    Source/DustEditor.cpp)

target_include_directories(WompDust PRIVATE Source)

target_compile_definitions(WompDust PUBLIC ${WOMP_JUCE_DEFINITIONS})

target_link_libraries(WompDust
    PRIVATE
        womp_shared
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)
