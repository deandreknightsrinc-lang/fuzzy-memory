Basic Pitch (audio-to-MIDI transcription) by Spotify, Apache License 2.0
https://github.com/spotify/basic-pitch-ts  (npm @spotify/basic-pitch 1.0.1)

basic-pitch.bundle.js bundles @spotify/basic-pitch with TensorFlow.js 3.21
(Apache License 2.0) using esbuild. model.json and group1-shard1of1.bin are the
pretrained model shipped with the package. The Basic Pitch license is in
LICENSE-basic-pitch.txt; the TensorFlow.js license notices are kept at the end of
the bundle (Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0).
Rebuild: npm i @spotify/basic-pitch@1.0.1 esbuild && esbuild entry.js --bundle --format=esm --minify
  where entry.js re-exports BasicPitch, outputToNotesPoly, addPitchBendsToNoteEvents,
  noteFramesToTime from @spotify/basic-pitch and setBackend/getBackend/ready from @tensorflow/tfjs.
