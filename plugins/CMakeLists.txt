# W.O.M.P. Plugins — Knight Lyfe · Weapons of Mass Production
#
#   cmake -B build -DCMAKE_BUILD_TYPE=Release
#   cmake --build build --config Release
#   ctest --test-dir build -C Release --output-on-failure
#
# macOS: builds AU + VST3. Linux/Windows: VST3 + Standalone.

cmake_minimum_required(VERSION 3.22)

# Must be set before project() to take effect on Apple platforms.
if(NOT DEFINED CMAKE_OSX_DEPLOYMENT_TARGET)
    set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version")
endif()

project(WompPlugins VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# Off by default so CI (and fresh machines) never try to write into system plugin folders.
option(WOMP_COPY_PLUGIN_AFTER_BUILD "Copy built plugins into the user's plug-in folders after building" OFF)
option(WOMP_BUILD_TESTS "Build the offline DSP test executable" ON)

# ---------------------------------------------------------------------------
# JUCE (pinned release tag). Set FETCHCONTENT_BASE_DIR to share/cache the checkout.
# ---------------------------------------------------------------------------
include(FetchContent)
set(WOMP_JUCE_TAG "8.0.15" CACHE STRING "JUCE git tag to fetch")
FetchContent_Declare(JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        ${WOMP_JUCE_TAG}
    GIT_SHALLOW    TRUE
    GIT_PROGRESS   FALSE)
FetchContent_MakeAvailable(JUCE)

if(APPLE)
    set(WOMP_FORMATS AU VST3)
else()
    set(WOMP_FORMATS VST3 Standalone)
endif()

if(WOMP_COPY_PLUGIN_AFTER_BUILD)
    set(WOMP_COPY_FLAG TRUE)
else()
    set(WOMP_COPY_FLAG FALSE)
endif()

# Definitions shared by every target that compiles JUCE modules.
set(WOMP_JUCE_DEFINITIONS
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0)

add_subdirectory(shared)
add_subdirectory(WompLowEnd)
add_subdirectory(WompDust)

if(WOMP_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
