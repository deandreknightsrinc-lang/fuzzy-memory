# Header-only helpers shared by both plugins (LookAndFeel, small DSP building blocks).
add_library(womp_shared INTERFACE)
target_include_directories(womp_shared INTERFACE ${CMAKE_CURRENT_SOURCE_DIR})
