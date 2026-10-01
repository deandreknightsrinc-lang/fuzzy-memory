// Audio → MIDI transcription with Spotify's Basic Pitch (vendor/basic-pitch).
// The model runs locally in the browser; nothing is uploaded.

const SAMPLE_RATE = 22050; // what the model expects
const FRAMES_PER_SECOND = SAMPLE_RATE / 256;

const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);

/** Presets tune the note detector for different sources. */
export const TRANSCRIBE_PRESETS = {
  piano: { label: 'Piano / keys', lo: 21, hi: 108, onset: 0.5, frame: 0.3, minMs: 60 },
  band: { label: 'Full song (busy mix)', lo: 28, hi: 100, onset: 0.6, frame: 0.4, minMs: 90 },
  melody: { label: 'Vocal / lead melody', lo: 45, hi: 90, onset: 0.55, frame: 0.35, minMs: 100 },
  bass: { label: 'Bass line', lo: 28, hi: 60, onset: 0.5, frame: 0.3, minMs: 90 },
};

let lib = null;
let model = null;

async function loadLib() {
  if (!lib) {
    lib = await import('../vendor/basic-pitch/basic-pitch.bundle.js');
    model = new lib.BasicPitch(new URL('../vendor/basic-pitch/model.json', import.meta.url).href);
  }
  return lib;
}

/** Mix any decoded audio down to mono at the model's sample rate. */
export async function resampleMono(audioBuffer) {
  const length = Math.ceil(audioBuffer.duration * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const src = ctx.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(ctx.destination);
  src.start();
  const out = await ctx.startRendering();
  return out.getChannelData(0);
}

/**
 * Run the model once. Returns the raw activations so notes can be re-derived
 * quickly when the user changes sensitivity settings.
 */
export async function analyze(audioBuffer, onProgress = () => {}) {
  const { ready } = await loadLib();
  await ready();
  const samples = await resampleMono(audioBuffer);
  const frames = [];
  const onsets = [];
  const contours = [];
  await model.evaluateModel(
    samples,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (p) => onProgress(p),
  );
  return { frames, onsets, contours, duration: audioBuffer.duration };
}

/** Turn activations into notes: [{ time, dur, note, vel }]. */
export function notesFrom(analysis, opts) {
  const { outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime } = lib;
  const minFrames = Math.max(1, Math.round((opts.minMs / 1000) * FRAMES_PER_SECOND));
  const raw = outputToNotesPoly(
    analysis.frames,
    analysis.onsets,
    opts.onset,
    opts.frame,
    minFrames,
    true,
    midiToHz(opts.hi),
    midiToHz(opts.lo),
    true,
  );
  return noteFramesToTime(addPitchBendsToNoteEvents(analysis.contours, raw))
    .map((n) => ({
      time: n.startTimeSeconds,
      dur: n.durationSeconds,
      note: n.pitchMidi,
      vel: Math.max(20, Math.min(127, Math.round(n.amplitude * 127))),
    }))
    .filter((n) => n.note >= opts.lo && n.note <= opts.hi)
    .sort((a, b) => a.time - b.time || a.note - b.note);
}

/** Notes → events for writeMidi (one piano track). */
export function notesToMidiEvents(notes, program = 0) {
  const events = [{ time: 0, bytes: [0xc0, program] }];
  for (const n of notes) {
    events.push({ time: n.time, bytes: [0x90, n.note, n.vel] });
    events.push({ time: n.time + n.dur, bytes: [0x80, n.note, 0] });
  }
  return events;
}
