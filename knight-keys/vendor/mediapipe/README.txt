MediaPipe Tasks Vision 1.0.1 (Google), Apache License 2.0
https://github.com/google-ai-edge/mediapipe  ·  https://www.npmjs.com/package/@mediapipe/tasks-vision

Files: vision_bundle.mjs, wasm/vision_wasm_internal.{js,wasm} (the SIMD build;
browsers without WebAssembly SIMD fall back to voice-only puppeteering), and the
Face Landmarker model face_landmarker.task (float16, version 1).

Used by the Puppet Studio for webcam face tracking. Runs entirely in the
browser: no video leaves the computer.
