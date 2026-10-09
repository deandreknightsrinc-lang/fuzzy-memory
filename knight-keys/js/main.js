// Knight Keys — app wiring: MIDI I/O, files, transport, panels and rendering.
import { parseMidi, buildSong, writeMidi, splitHands } from './midi-file.js';
import { makeChoirParts, choirMidi, PARTS as CHOIR_PARTS } from './choir.js';
import { songToScore, scoreToMusicXML, musicXmlToMidi, scoreFileText } from './notation.js';
import { lyricLines, lineAt } from './lyrics.js';
import { TEACHERS, COURSE_TEACHERS, teacherById, characterBrief, characterFor } from './teachers.js';
import { BUNDLED_PACKS } from './course-packs.js';
import { SEGMENT_TYPES, newService, validateService, stageFrame, invitePost, hostScript, loadServices, saveServices } from './church.js';
import { renderStage, STAGE_CSS } from './stage-view.js';
import { QUICK_ASKS, buildMessages, normalizeServer, listModels, askTeacher, loadAskHistory, saveAskHistory, teacherFaceSvg, FACE_CSS } from './ai-teacher.js';
import { REST_POSE, poseFromBlendshapes, headAngles, poseFromHead, mouthFromLevel, smoothPose, GESTURES, combinePose, applyPose, PUPPET_BACKGROUNDS } from './puppet.js';
import { STEP_TYPES, STEP_LABELS, newCourse, courseToPack, validateCourse, videoSource, lessonScript, scriptsCsv, loadCourses, saveCourses, loadVideos, saveVideos, saveVideoFile, loadVideoFile } from './courses.js';
import { ROLES as BAND_ROLES, arrangeBand, bandMidi, chordsFromChart, songInBeats, transposeSymbol } from './band.js';
import { Synth, PRESETS, LIVE_CHANNEL, LIVE_LEFT_CHANNEL, DRUM_CHANNEL, GROOVE_CHANNEL } from './synth.js';
import { Player } from './player.js';
import { KeyboardView, drawStaff, drawControllers, drawGroove, drawPianoRoll, drawDrumHighway, drawFretboard } from './render.js';
import { TUNINGS, STRING_NAMES, fretNote, chordShape, chordTarget, chartTimeline, ChartJudge, rootPosition } from './fretted.js';
import { INSTRUMENTS, instrumentById, instrumentHome, songsToShow, tunerLesson } from './home.js';
import { UNITS, COURSES, unitsFor, readNotes, grooveMidi, DrumJudge, addCourse, removeCourse, pathState, lessonStars, starsForMistakes, starsForAccuracy, starsForSinging, updateStreak, currentStreak } from './lessons.js';
import { PitchListener, SingJudge, RangeFinder, voiceType, freqToCents, midiToFreq, chromaMatches } from './pitch.js';
import { GameSession, crownsFor, loadStage, saveStage, recordScore, courseState, scoreKey, PLAYER_COLORS } from './game.js';
import { LANES, laneOf, sameDrum, PIECES, KITS, DRUM_OUTPUTS, ROUTE_DEFAULT, ROUTE_MAIN, ROUTE_PRESETS, outputName, logicChannels, routeOutput, routeRows, routesFromHost, kitById, resolveKit, kitNoteParams, loadSavedSamples, saveSample, deleteSample } from './drumkit.js';
import { detectChord, noteName, pcName, solfege, keyName } from './theory.js';
import { createDemoMidi } from './demo.js';
import { GROOVES, GroovePlayer } from './grooves.js';
import { SONGS, LEVELS, LEVEL_NAMES, DRUM_STYLE_NAMES, parsePitch, songToMidi, chartToChords, validateSong, loadMySongs, saveMySongs } from './songs.js';
import { HostSynth, HostTransport, HostListener, IN_HOST, hostCanListen, onHostMidi, onHostTransport, hostSave, queryHostKit } from './host.js';

const $ = (id) => document.getElementById(id);

const GM_NAMES = (
  'Acoustic Grand Piano|Bright Acoustic Piano|Electric Grand Piano|Honky-tonk Piano|Electric Piano 1|Electric Piano 2|Harpsichord|Clavinet|' +
  'Celesta|Glockenspiel|Music Box|Vibraphone|Marimba|Xylophone|Tubular Bells|Dulcimer|' +
  'Drawbar Organ|Percussive Organ|Rock Organ|Church Organ|Reed Organ|Accordion|Harmonica|Tango Accordion|' +
  'Nylon Guitar|Steel Guitar|Jazz Guitar|Clean Guitar|Muted Guitar|Overdriven Guitar|Distortion Guitar|Guitar Harmonics|' +
  'Acoustic Bass|Fingered Bass|Picked Bass|Fretless Bass|Slap Bass 1|Slap Bass 2|Synth Bass 1|Synth Bass 2|' +
  'Violin|Viola|Cello|Contrabass|Tremolo Strings|Pizzicato Strings|Orchestral Harp|Timpani|' +
  'String Ensemble 1|String Ensemble 2|Synth Strings 1|Synth Strings 2|Choir Aahs|Voice Oohs|Synth Voice|Orchestra Hit|' +
  'Trumpet|Trombone|Tuba|Muted Trumpet|French Horn|Brass Section|Synth Brass 1|Synth Brass 2|' +
  'Soprano Sax|Alto Sax|Tenor Sax|Baritone Sax|Oboe|English Horn|Bassoon|Clarinet|' +
  'Piccolo|Flute|Recorder|Pan Flute|Blown Bottle|Shakuhachi|Whistle|Ocarina|' +
  'Square Lead|Saw Lead|Calliope Lead|Chiff Lead|Charang Lead|Voice Lead|Fifths Lead|Bass + Lead|' +
  'New Age Pad|Warm Pad|Polysynth Pad|Choir Pad|Bowed Pad|Metallic Pad|Halo Pad|Sweep Pad|' +
  'Rain FX|Soundtrack FX|Crystal FX|Atmosphere FX|Brightness FX|Goblins FX|Echoes FX|Sci-fi FX|' +
  'Sitar|Banjo|Shamisen|Koto|Kalimba|Bagpipe|Fiddle|Shanai|' +
  'Tinkle Bell|Agogo|Steel Drums|Woodblock|Taiko Drum|Melodic Tom|Synth Drum|Reverse Cymbal|' +
  'Guitar Fret Noise|Breath Noise|Seashore|Bird Tweet|Telephone Ring|Helicopter|Applause|Gunshot'
).split('|');

const CHANNEL_COLORS = [
  '#4f8cff', '#ff7a45', '#36cfc9', '#f759ab', '#9254de', '#fadb14', '#73d13d', '#ff4d4f',
  '#40a9ff', '#ffa940', '#5cdbd3', '#ff85c0', '#b37feb', '#d3f261', '#95de64', '#ff9c6e',
];

const KB_RANGES = { 88: [21, 108], 76: [28, 103], 61: [36, 96], 49: [36, 84], 37: [48, 84], 25: [48, 72] };

const DEFAULTS = {
  inputId: 'all',
  outputId: 'none',
  fwdInput: false,
  fwdPlayback: false,
  internalSynth: true,
  lessonMidiSound: false,
  kbRange: '88',
  kbShift: 0,
  kbStyle: 'vector',
  kbLabels: 'none',
  cMarkers: true,
  sustainHold: true,
  showWheels: true,
  showPedals: true,
  inputColor: '#4f8cff',
  liveInstrument: 'grand',
  pianoQuality: 'auto',
  liveMix: 1,
  split: {
    enabled: false,
    point: 60,
    leftColor: '#ff7a45',
    rightColor: '#36cfc9',
    leftOctave: 0,
    rightOctave: 0,
    splitSound: false,
    leftInstrument: 'bass',
  },
  solfege: 'off',
  chordSource: 'all',
  workspaceBg: '#0e0f13',
  key: 'auto',
  spelling: 'auto',
  master: 0.8,
  keepPitch: true,
  lessonOffset: 0,
  groove: { id: GROOVES[0].id, bpm: GROOVES[0].bpm, intensity: 'full', autoFill: 0, volume: 1, lock: true },
  followHost: true, // plug-in: play songs and grooves in time with Logic's transport
  kit: { id: 'studio', custom: {} }, // Kit Rack: built-in kit + your tweaks per drum
  drumRoutes: null, // plug-in multi-output: { pieceId: output } (null = never changed: by drum type)
  drumView: 'grid', // drums panel: 'grid' (groove) or 'highway' (falling notes)
};

// ---- Persistence ---------------------------------------------------------

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

const stored = load('kk.settings', {});
const settings = {
  ...DEFAULTS,
  ...stored,
  split: { ...DEFAULTS.split, ...(stored.split || {}) },
  groove: { ...DEFAULTS.groove, ...(stored.groove || {}) },
  kit: { ...DEFAULTS.kit, ...(stored.kit || {}) },
};
// Settings saved before the sampled grand existed: move "piano" players onto it.
if (!stored.v || stored.v < 2) {
  if (settings.liveInstrument === 'piano') settings.liveInstrument = 'grand';
  settings.v = 2;
}
const saveSettings = () => save('kk.settings', settings);

// ---- Core state ------------------------------------------------------------

// Inside the Knight Lyfe Ultimate plug-in/app, the C++ engine makes the sound.
const synth = IN_HOST ? new HostSynth() : new Synth();
synth.setMaster(settings.master);
synth.sampleBase = 'samples/salamander/';

// Auto: all 4 velocity layers (~360 MB decoded) on computers with 8 GB or more,
// 1 layer (~90 MB) on phones and smaller machines.
function resolvePianoQuality() {
  if (settings.pianoQuality !== 'auto') return settings.pianoQuality;
  const desktop = window.matchMedia?.('(pointer: fine)').matches;
  const memory = navigator.deviceMemory ?? 8;
  return desktop && memory >= 8 ? 'high' : 'light';
}
synth.pianoQuality = resolvePianoQuality();

function updatePianoStatus() {
  const el = document.getElementById('pianoStatus');
  if (!el) return;
  const want = synth.wantedLayers().length;
  const have = synth.loadedLayers.size;
  const s = synth.samplesState;
  el.textContent =
    s === 'failed'
      ? "Samples couldn't load, so the synth piano is playing."
      : s === 'idle'
        ? `Using ${synth.pianoQuality} quality. Samples load the first time you play.`
        : have < want
          ? `Loading velocity layers: ${have} of ${want} ready…`
          : `${have} velocity layer${have > 1 ? 's' : ''} loaded (${synth.pianoQuality} quality).`;
}
synth.onSamplesState = (s) => {
  if (s === 'failed') toast("Couldn't load the grand piano samples, so the synth piano is playing instead.");
  updatePianoStatus();
};
const media = $('media');

const state = {
  song: null,
  midiBytes: null,
  midiName: '',
  mediaFile: null,
  mediaUrl: null,
  mediaReady: false,
  lessonMode: false,
  hostDriven: false, // Logic is playing the song (plug-in, "Follow Logic")
  loop: { enabled: false, a: 0, b: 0 },
  loops: [],
  rate: 1,
  transpose: 0,
  chan: Array.from({ length: 16 }, (_, ch) => ({
    mute: false,
    solo: false,
    color: CHANNEL_COLORS[ch],
    mix: 1,
    preset: '',
    program: 0,
  })),
  recording: null,
  lastRecording: null,
};

let dirty = true;
const markDirty = () => (dirty = true);

// ---- Display state (what is lit on screen) ------------------------------

const sources = new Map(); // 'in' | channel number -> { down: Map(note->count), sustained: Set, sustain }
const sourceOf = (id) => {
  if (!sources.has(id)) sources.set(id, { down: new Map(), sustained: new Set(), sustain: false });
  return sources.get(id);
};
const liveColor = new Map();
const liveCtl = { bend: 0, mod: 0, sustain: false, sostenuto: false, soft: false };
const playCtl = Array.from({ length: 16 }, () => ({ sustain: false, sostenuto: false, soft: false }));
const lastWheel = { bend: 0, mod: 0 };

function dNoteOn(id, note) {
  const s = sourceOf(id);
  s.down.set(note, (s.down.get(note) || 0) + 1);
  s.sustained.delete(note);
  markDirty();
}

function dNoteOff(id, note) {
  const s = sourceOf(id);
  const c = s.down.get(note);
  if (!c) return;
  if (c > 1) {
    s.down.set(note, c - 1);
  } else {
    s.down.delete(note);
    if (s.sustain) s.sustained.add(note);
  }
  markDirty();
}

function dSustain(id, on) {
  const s = sourceOf(id);
  s.sustain = on;
  if (!on) s.sustained.clear();
  markDirty();
}

function clearPlaybackDisplay() {
  for (const [id, s] of sources) {
    if (id === 'in') continue;
    s.down.clear();
    s.sustained.clear();
    s.sustain = false;
  }
  playCtl.forEach((c) => Object.assign(c, { sustain: false, sostenuto: false, soft: false }));
  markDirty();
}

function effectiveMute(ch) {
  const anySolo = state.chan.some((c) => c.solo);
  return state.chan[ch].mute || (anySolo && !state.chan[ch].solo);
}

function applyMutes() {
  for (let ch = 0; ch < 16; ch++) synth.setMuted(ch, effectiveMute(ch));
  markDirty();
}

function visibleChannels() {
  const out = [];
  for (let ch = 0; ch < 16; ch++) if (ch !== DRUM_CHANNEL && !effectiveMute(ch)) out.push(ch);
  return out;
}

/** Color for a key, or null when unlit. */
const LEARN_COLOR = '#ffd60a';

function keyState(note) {
  const live = sourceOf('in');
  if (live.down.has(note)) return { color: liveColor.get(note) || settings.inputColor };
  if (lessonRun.targets.size) {
    if (lessonRun.targets.has(note)) return { color: LEARN_COLOR };
    if (lessonRun.upcoming === note) return { color: LEARN_COLOR, faded: true };
  }
  if (learn.enabled && !learn.drums && !(lessonRun.active && lessonRun.step?.noHints)) {
    if (learn.expected.has(note)) return { color: LEARN_COLOR };
    if (learn.next.includes(note)) return { color: LEARN_COLOR, faded: true };
  }
  const chans = visibleChannels();
  for (const ch of chans) if (sources.get(ch)?.down.has(note)) return { color: state.chan[ch].color };
  if (settings.sustainHold) {
    if (live.sustained.has(note)) return { color: liveColor.get(note) || settings.inputColor, faded: true };
    for (const ch of chans) if (sources.get(ch)?.sustained.has(note)) return { color: state.chan[ch].color, faded: true };
  }
  return null;
}

/** Notes for chord/staff display: [{ midi, color }]. */
function soundingNotes(which = settings.chordSource) {
  const out = new Map();
  const take = (id, color) => {
    const s = sources.get(id);
    if (!s) return;
    for (const n of s.down.keys()) if (!out.has(n)) out.set(n, typeof color === 'function' ? color(n) : color);
    if (settings.sustainHold) for (const n of s.sustained) if (!out.has(n)) out.set(n, typeof color === 'function' ? color(n) : color);
  };
  if (which !== 'playback') take('in', (n) => liveColor.get(n) || settings.inputColor);
  if (which !== 'input') for (const ch of visibleChannels()) take(ch, state.chan[ch].color);
  return [...out].map(([midi, color]) => ({ midi, color })).sort((a, b) => a.midi - b.midi);
}

const keySf = () => (settings.key === 'auto' ? state.song?.keySig?.sf ?? 0 : Number(settings.key));
const keyMinor = () => (settings.key === 'auto' ? !!state.song?.keySig?.minor : false);
const solfegeMode = () => (settings.solfege === 'off' ? 'fixed' : settings.solfege);

// ---- Visual event queue (keeps lights in sync with scheduled audio) ------

// Kept sorted by time: the song player and the groove player both feed it.
let visualQueue = [];
function atTime(t, fn, groove = false) {
  let i = visualQueue.length;
  while (i > 0 && visualQueue[i - 1].t > t) i--;
  visualQueue.splice(i, 0, { t, fn, groove });
}

// ---- MIDI output ---------------------------------------------------------

let midiAccess = null;
let midiOut = null;

function sendOut(bytes, at) {
  if (!midiOut) return;
  try {
    const delay = at === undefined || !synth.ctx ? 0 : Math.max(0, (at - synth.now) * 1000);
    midiOut.send(bytes, performance.now() + delay);
  } catch {
    /* device went away */
  }
}

function outputAllOff() {
  if (!midiOut) return;
  try {
    midiOut.clear?.();
  } catch {
    /* not supported */
  }
  for (let ch = 0; ch < 16; ch++) {
    sendOut([0xb0 | ch, 64, 0]);
    sendOut([0xb0 | ch, 123, 0]);
  }
}

// ---- Player --------------------------------------------------------------

const playbackSound = () => settings.internalSynth && (!state.lessonMode || settings.lessonMidiSound);

const player = new Player({
  now: () => synth.now,
  noteOn(ch, note, vel, at) {
    if (playbackSound()) synth.noteOn(ch, note, vel, at);
    if (settings.fwdPlayback) sendOut([0x90 | ch, note, vel], at);
    atTime(at, () => {
      dNoteOn(ch, note);
      if (ch === DRUM_CHANNEL && !effectiveMute(ch)) flashPad(note, vel);
    });
  },
  noteOff(ch, note, at) {
    if (playbackSound()) synth.noteOff(ch, note, at);
    if (settings.fwdPlayback) sendOut([0x80 | ch, note, 0], at);
    atTime(at, () => dNoteOff(ch, note));
  },
  control(ch, cc, value, at) {
    synth.control(ch, cc, value, at);
    if (settings.fwdPlayback) sendOut([0xb0 | ch, cc, value], at);
    if (cc === 64 || cc === 66 || cc === 67 || cc === 1) {
      atTime(at, () => {
        const on = value >= 64;
        if (cc === 64) {
          playCtl[ch].sustain = on;
          dSustain(ch, on);
        } else if (cc === 66) playCtl[ch].sostenuto = on;
        else if (cc === 67) playCtl[ch].soft = on;
        else lastWheel.mod = value / 127;
        markDirty();
      });
    }
  },
  program(ch, program, at) {
    synth.program(ch, program);
    if (settings.fwdPlayback) sendOut([0xc0 | ch, program], at);
    atTime(at, () => {
      if (state.chan[ch].program !== program) {
        state.chan[ch].program = program;
        updateMixerNames();
      }
    });
  },
  pitch(ch, value, at) {
    synth.pitchBend(ch, value, at);
    if (settings.fwdPlayback) {
      const v = value + 8192;
      sendOut([0xe0 | ch, v & 0x7f, v >> 7], at);
    }
    atTime(at, () => {
      lastWheel.bend = value / 8192;
      markDirty();
    });
  },
  allNotesOff(at) {
    synth.allNotesOff(at);
    if (settings.fwdPlayback) outputAllOff();
    // A locked groove stops with the song; a free-running one keeps going.
    if (groove.locked) synth.cancelOneShots(at, GROOVE_CHANNEL);
    visualQueue = visualQueue.filter((e) => e.t < at || (e.groove && !groove.locked));
    atTime(at, clearPlaybackDisplay);
  },
  span(from, to, ctxAt) {
    if (groove.locked && state.song) groove.scheduleSpan(from, to, ctxAt, state.song);
  },
  onEnd() {
    if (lessonRun.active && lessonRun.step?.type === 'song') return lessonSongDone();
    if (lessonRun.active && lessonRun.step?.type === 'groove') return lessonGrooveDone();
    if (lessonRun.active && lessonRun.step?.type === 'chart') return lessonChartDone();
    if (stageRun.phase === 'play') return finishStage();
    if (learn.enabled && learn.total) {
      const pct = Math.round((100 * learn.correct) / Math.max(1, learn.correct + learn.wrong));
      toast(`Song complete! ${learn.correct} notes, ${pct}% accuracy.`, [], 6000);
    }
    markDirty();
  },
  onWait(notes, time) {
    learn.expected = new Set(notes);
    learn.next = player.nextTargets(time);
    learn.total += notes.length;
    markDirty();
  },
});
player.loop = state.loop;

// ---- Live input ------------------------------------------------------------

const liveMap = new Map(); // physical note -> { note, ch }

function record(bytes, note) {
  const r = state.recording;
  if (!r) return;
  const time = r.media ? media.currentTime + Number(settings.lessonOffset || 0) : (performance.now() - r.t0) / 1000;
  const b = [...bytes];
  if (note !== undefined) b[1] = note;
  r.events.push({ time, bytes: b });
}

function handleLive(bytes) {
  const st = bytes[0];
  if (st >= 0xf0) return; // clock, active sensing, sysex
  const type = st & 0xf0;
  const d1 = bytes[1] ?? 0;
  const d2 = bytes[2] ?? 0;
  // Channel 10 is drums (pad controllers, e-kits): play the drum sounds and light the pads.
  if ((st & 0x0f) === DRUM_CHANNEL && (type === 0x90 || type === 0x80)) {
    if (type === 0x90 && d2 > 0) liveDrum(d1, d2);
    return;
  }
  if (type === 0x90 && d2 > 0) liveOn(d1, d2);
  else if (type === 0x80 || type === 0x90) liveOff(d1);
  else if (type === 0xb0) liveCC(d1, d2);
  else if (type === 0xe0) {
    const v = ((d2 << 7) | d1) - 8192;
    synth.pitchBend(LIVE_CHANNEL, v);
    synth.pitchBend(LIVE_LEFT_CHANNEL, v);
    liveCtl.bend = v / 8192;
    lastWheel.bend = liveCtl.bend;
    record(bytes);
    if (settings.fwdInput) sendOut(bytes);
    markDirty();
  }
}

function liveOn(n, vel) {
  synth.ensure();
  if (liveMap.has(n)) liveOff(n);
  const sp = settings.split;
  const left = sp.enabled && n < sp.point;
  const shift = sp.enabled ? 12 * (left ? sp.leftOctave : sp.rightOctave) : 0;
  const note = Math.max(0, Math.min(127, n + shift));
  const ch = left && sp.splitSound ? LIVE_LEFT_CHANNEL : LIVE_CHANNEL;
  liveMap.set(n, { note, ch });
  if (settings.internalSynth) synth.noteOn(ch, note, vel);
  if (settings.fwdInput) sendOut([0x90, note, vel]);
  record([0x90, note, vel]);
  liveColor.set(note, sp.enabled ? (left ? sp.leftColor : sp.rightColor) : settings.inputColor);
  dNoteOn('in', note);
  learnCheck(note, false);
  stageHit(note, false);
  lessonHit(note);
}

function liveOff(n) {
  const m = liveMap.get(n);
  if (!m) return;
  liveMap.delete(n);
  synth.noteOff(m.ch, m.note);
  if (settings.fwdInput) sendOut([0x80, m.note, 0]);
  record([0x80, m.note, 0]);
  dNoteOff('in', m.note);
}

function liveCC(cc, value) {
  synth.ensure();
  synth.control(LIVE_CHANNEL, cc, value);
  synth.control(LIVE_LEFT_CHANNEL, cc, value);
  if (settings.fwdInput) sendOut([0xb0, cc, value]);
  record([0xb0, cc, value]);
  const on = value >= 64;
  if (cc === 64) {
    liveCtl.sustain = on;
    dSustain('in', on);
  } else if (cc === 66) liveCtl.sostenuto = on;
  else if (cc === 67) liveCtl.soft = on;
  else if (cc === 1) {
    liveCtl.mod = value / 127;
    lastWheel.mod = liveCtl.mod;
  } else if (cc === 120 || cc === 123) liveAllOff();
  markDirty();
}

function liveAllOff() {
  for (const n of [...liveMap.keys()]) liveOff(n);
}

// Web MIDI
async function initMidi() {
  const status = $('midiStatus');
  if (IN_HOST) {
    status.textContent = "MIDI comes from Logic (or from Audio/MIDI Settings in the standalone app). Sound is played by the Knight Lyfe engine.";
    onHostMidi((msgs) => {
      synth.fromHost = true; // the engine already played these
      try {
        for (const m of msgs) handleLive(m);
      } finally {
        synth.fromHost = false;
      }
    });
    fillDeviceSelects();
    return;
  }
  if (!navigator.requestMIDIAccess) {
    status.textContent = 'This browser has no Web MIDI. Use Chrome, Edge, Opera or Firefox to connect a keyboard. Mouse and computer keys still work.';
    fillDeviceSelects();
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = () => fillDeviceSelects();
    fillDeviceSelects();
  } catch (err) {
    status.textContent = `MIDI access was blocked (${err.message || err.name}). Allow MIDI for this site to use a keyboard.`;
    fillDeviceSelects();
  }
}

function fillDeviceSelects() {
  const inSel = $('midiIn');
  const outSel = $('midiOut');
  const inputs = midiAccess ? [...midiAccess.inputs.values()] : [];
  const outputs = midiAccess ? [...midiAccess.outputs.values()] : [];
  inSel.innerHTML = '';
  inSel.append(new Option('All inputs', 'all'), new Option('None', 'none'));
  for (const i of inputs) inSel.append(new Option(i.name, i.id));
  inSel.value = [...inSel.options].some((o) => o.value === settings.inputId) ? settings.inputId : 'all';
  outSel.innerHTML = '';
  outSel.append(new Option('None', 'none'));
  for (const o of outputs) outSel.append(new Option(o.name, o.id));
  outSel.value = [...outSel.options].some((o) => o.value === settings.outputId) ? settings.outputId : 'none';

  for (const i of inputs) {
    i.onmidimessage = inSel.value === 'all' || inSel.value === i.id ? (e) => handleLive(e.data) : null;
  }
  midiOut = outSel.value === 'none' ? null : midiAccess.outputs.get(outSel.value) || null;
  if (midiAccess) {
    const names = inputs.map((i) => i.name).join(', ');
    $('midiStatus').textContent = inputs.length ? `Connected: ${names}` : 'No MIDI keyboard found. Plug one in — it appears here automatically.';
  }
}

// Computer keyboard
const KEYMAP = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9,
  KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};
let kbOctave = 0;
const kbDown = new Map();

function typingTarget(e) {
  const t = e.target;
  return t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement || $('settingsDlg').open;
}

window.addEventListener('keydown', (e) => {
  if (typingTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Space' && e.target instanceof HTMLButtonElement) return; // native button activation
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) togglePlay();
    return;
  }
  if (e.repeat) return;
  if (e.code === 'KeyG' && !e.shiftKey) {
    toggleGroove();
    return;
  }
  if (e.code === 'KeyF' && groove.playing) {
    groove.fill();
    toast('Fill coming up');
    return;
  }
  if (e.code === 'KeyZ') {
    kbOctave = Math.max(-4, kbOctave - 1);
    toast(`Computer keys: C${4 + kbOctave}`);
  } else if (e.code === 'KeyX') {
    kbOctave = Math.min(4, kbOctave + 1);
    toast(`Computer keys: C${4 + kbOctave}`);
  } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    liveCC(64, 127);
  } else if (e.code in KEYMAP) {
    const n = 60 + kbOctave * 12 + KEYMAP[e.code];
    kbDown.set(e.code, n);
    liveOn(n, 96);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    if (liveCtl.sustain) liveCC(64, 0);
  } else if (kbDown.has(e.code)) {
    liveOff(kbDown.get(e.code));
    kbDown.delete(e.code);
  }
});

window.addEventListener('blur', () => {
  for (const n of kbDown.values()) liveOff(n);
  kbDown.clear();
});

// Mouse / touch on the keyboard
const keyboard = new KeyboardView($('keysCanvas'));
const pointerNotes = new Map();
$('keysCanvas').addEventListener('pointerdown', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  const note = keyboard.noteAt(e.clientX - r.left, e.clientY - r.top);
  if (note === null) return;
  e.currentTarget.setPointerCapture(e.pointerId);
  const vel = Math.round(50 + 70 * Math.min(1, (e.clientY - r.top) / r.height));
  pointerNotes.set(e.pointerId, note);
  liveOn(note, vel);
});
$('keysCanvas').addEventListener('pointermove', (e) => {
  if (!pointerNotes.has(e.pointerId)) return;
  const r = e.currentTarget.getBoundingClientRect();
  const note = keyboard.noteAt(e.clientX - r.left, e.clientY - r.top);
  const prev = pointerNotes.get(e.pointerId);
  if (note !== null && note !== prev) {
    liveOff(prev);
    pointerNotes.set(e.pointerId, note);
    liveOn(note, 90);
  }
});
const pointerEnd = (e) => {
  if (!pointerNotes.has(e.pointerId)) return;
  liveOff(pointerNotes.get(e.pointerId));
  pointerNotes.delete(e.pointerId);
};
$('keysCanvas').addEventListener('pointerup', pointerEnd);
$('keysCanvas').addEventListener('pointercancel', pointerEnd);

// ---- Files -------------------------------------------------------------------

const MIDI_EXT = /\.(mid|midi|kar|rmi|smf)$/i;
const LESSON_EXT = /\.(klesson|json)$/i;
const MEDIA_EXT = /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|mp4|m4v|mov|webm|mkv)$/i;
const SCORE_EXT = /\.(musicxml|mxl|xml)$/i;

async function handleFiles(files) {
  for (const file of files) {
    try {
      if (SCORE_EXT.test(file.name)) await openScoreFile(file);
      else if (LESSON_EXT.test(file.name)) await loadLesson(JSON.parse(await file.text()));
      else if (MIDI_EXT.test(file.name) || file.type === 'audio/midi' || file.type === 'audio/x-midi') {
        loadMidiBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      } else if (file.type.startsWith('audio/') || file.type.startsWith('video/') || MEDIA_EXT.test(file.name)) {
        loadMedia(file);
      } else {
        toast(`Can't open ${file.name} — use MIDI, MusicXML, audio, video or .klesson files.`);
      }
    } catch (err) {
      console.error(err);
      toast(`Couldn't open ${file.name}: ${err.message}`);
    }
  }
}

function resetChannels() {
  for (let ch = 0; ch < 16; ch++) {
    Object.assign(synth.channels[ch], { program: 0, volume: 100, expression: 127, pan: 64, bend: 0, sustain: false });
    synth.updateChannelGain(ch);
  }
}

function loadMidiBytes(bytes, name, { keepLoops = false } = {}) {
  const song = buildSong(parseMidi(bytes));
  synth.ensure();
  player.load(null);
  resetChannels();
  clearPlaybackDisplay();
  state.song = song;
  state.songVerses = null;
  state.midiBytes = bytes;
  state.midiName = name.replace(/\.[^.]+$/, '');
  for (let ch = 0; ch < 16; ch++) {
    const p = Math.max(0, song.firstProgram[ch]);
    state.chan[ch].program = p;
    synth.program(ch, p);
    synth.setPresetOverride(ch, state.chan[ch].preset);
  }
  if (!keepLoops) {
    state.loops = [];
    Object.assign(state.loop, { enabled: false, a: 0, b: 0 });
  }
  player.load(song);
  player.transpose = state.transpose;
  player.setRate(state.rate);
  updateLessonMode();
  scoreView.hidden.clear();
  if ($('scoreDlg').open) setTimeout(renderScore);
  buildMixer();
  renderLoops();
  updateTitle();
  fillKeySelect();
  updateGrooveLock();
  state.librarySong = null;
  state.libraryChart = false;
  updateLearnParts();
  markDirty();
}

function loadMedia(file) {
  ejectMedia(false);
  state.mediaFile = file;
  state.mediaUrl = URL.createObjectURL(file);
  state.mediaReady = false;
  const isVideo = file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|mkv)$/i.test(file.name);
  const body = media.parentElement;
  body.classList.toggle('has-video', isVideo);
  $('mediaEmpty').hidden = true;
  $('mediaAudioLabel').hidden = isVideo;
  $('mediaAudioLabel').textContent = `♪ ${file.name}`;
  media.src = state.mediaUrl;
  media.load();
  applyRate();
  showPanel('media', true);
  updateTitle();
}

media.addEventListener('loadedmetadata', () => {
  state.mediaReady = true;
  if (media.videoWidth > 0) {
    media.parentElement.classList.add('has-video');
    $('mediaAudioLabel').hidden = true;
  }
  applyRate();
  updateLessonMode();
  markDirty();
});
media.addEventListener('error', () => {
  if (state.mediaFile) toast(`This browser can't play ${state.mediaFile.name}.`);
});

function ejectMedia(update = true) {
  media.pause();
  media.removeAttribute('src');
  media.load();
  if (state.mediaUrl) URL.revokeObjectURL(state.mediaUrl);
  Object.assign(state, { mediaFile: null, mediaUrl: null, mediaReady: false });
  media.parentElement.classList.remove('has-video');
  $('mediaEmpty').hidden = false;
  $('mediaAudioLabel').hidden = true;
  if (update) {
    updateLessonMode();
    updateTitle();
  }
}

function ejectMidi() {
  player.load(null);
  clearPlaybackDisplay();
  Object.assign(state, { song: null, midiBytes: null, midiName: '' });
  updateLessonMode();
  buildMixer();
  updateTitle();
  fillKeySelect();
  updateGrooveLock();
  setLearn(false);
  updateLearnParts();
}

function updateLessonMode() {
  const lesson = !!state.song && !!state.mediaFile;
  if (lesson !== state.lessonMode || player.follow !== lesson) {
    state.lessonMode = lesson;
    if (lesson && learn.enabled) setLearn(false);
    player.setFollow(lesson);
    if (lesson) player.seek(media.currentTime + Number(settings.lessonOffset || 0));
  }
}

function updateTitle() {
  const el = $('songTitle');
  el.innerHTML = '';
  const chip = (icon, text, onEject) => {
    const s = document.createElement('span');
    s.textContent = `${icon} ${text} `;
    const b = document.createElement('button');
    b.className = 'mini';
    b.textContent = '✕';
    b.title = 'Close';
    b.onclick = onEject;
    s.append(b, ' ');
    el.append(s);
  };
  if (state.song) chip('🎹', state.song.title || state.midiName, ejectMidi);
  if (state.mediaFile) chip(state.mediaFile.type.startsWith('video') ? '🎬' : '🎧', state.mediaFile.name, () => ejectMedia());
  if (!state.song && !state.mediaFile) {
    el.textContent = 'No file loaded · ';
    const demo = document.createElement('button');
    demo.className = 'mini';
    demo.textContent = 'Try the demo';
    demo.onclick = () => loadMidiBytes(createDemoMidi(), 'Demo.mid');
    el.append(demo);
  }
  el.title = el.textContent;
}

// Lessons (.klesson = MIDI + media + loops + settings in one file)
function toB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(str) {
  const bin = atob(str);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function download(data, filename, type) {
  if (IN_HOST) {
    hostSave(typeof data === 'string' ? new TextEncoder().encode(data) : data, filename);
    return;
  }
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function saveLesson() {
  if (!state.song && !state.mediaFile) {
    toast('Load a MIDI and/or media file first.');
    return;
  }
  const lesson = {
    app: 'knight-keys',
    version: 1,
    title: state.song?.title || state.midiName || state.mediaFile?.name || 'Lesson',
    midi: state.midiBytes ? toB64(state.midiBytes) : null,
    midiName: state.midiName,
    media: state.mediaFile
      ? { name: state.mediaFile.name, type: state.mediaFile.type, data: toB64(new Uint8Array(await state.mediaFile.arrayBuffer())) }
      : null,
    loops: state.loops,
    loop: { ...state.loop },
    key: settings.key,
    rate: state.rate,
    transpose: state.transpose,
    lessonOffset: Number(settings.lessonOffset || 0),
    channels: state.chan.map(({ mute, solo, color, mix, preset }) => ({ mute, solo, color, mix, preset })),
  };
  const name = (state.midiName || state.mediaFile?.name || 'lesson').replace(/\.[^.]+$/, '');
  download(JSON.stringify(lesson), `${name}.klesson`, 'application/json');
}

async function loadLesson(lesson) {
  if (lesson.app !== 'knight-keys') throw new Error('not a Knight Keys lesson');
  ejectMedia(false);
  if (lesson.channels) lesson.channels.forEach((c, ch) => Object.assign(state.chan[ch], c));
  if (lesson.media) {
    const bytes = fromB64(lesson.media.data);
    loadMedia(new File([bytes], lesson.media.name, { type: lesson.media.type }));
  }
  state.loops = lesson.loops || [];
  Object.assign(state.loop, lesson.loop || { enabled: false, a: 0, b: 0 });
  if (lesson.key !== undefined) settings.key = lesson.key;
  settings.lessonOffset = lesson.lessonOffset || 0;
  state.transpose = lesson.transpose || 0;
  setRate(lesson.rate || 1);
  if (lesson.midi) loadMidiBytes(fromB64(lesson.midi), lesson.midiName || lesson.title, { keepLoops: true });
  else ejectMidi();
  applyMutes();
  syncSettingsUI();
  renderLoops();
  updateTransposeUI();
  toast(`Lesson loaded: ${lesson.title}`);
}

// ---- Transport -----------------------------------------------------------

const hasMedia = () => !!state.mediaFile;
const tDuration = () => (hasMedia() ? (Number.isFinite(media.duration) ? media.duration : 0) : player.duration);
const tTime = () => (hasMedia() ? media.currentTime : player.time);
const isPlaying = () => (hasMedia() ? !media.paused : player.playing || !!player.waiting || state.hostDriven);

/** Logic is playing the song: the in-app transport stays out of its way. */
function hostBusy() {
  if (!state.hostDriven) return false;
  toast('Logic is playing the song. Use Logic\'s transport, or untick "Follow Logic" on the Groove panel.');
  return true;
}

function togglePlay() {
  if (hostBusy()) return;
  synth.ensure();
  if (hasMedia()) {
    if (media.paused) media.play().catch((err) => toast(`Can't play: ${err.message}`));
    else media.pause();
  } else if (state.song) {
    if (player.playing || player.waiting) {
      player.pause();
      learn.expected.clear();
    } else player.play();
  } else {
    toast('Open a MIDI, audio or video file — or try the demo.');
  }
  markDirty();
}

function stopAll() {
  if (hostBusy()) return;
  const start = state.loop.enabled ? state.loop.a : 0;
  if (hasMedia()) {
    media.pause();
    media.currentTime = start;
  } else {
    player.stop();
  }
  markDirty();
}

function seek(t) {
  if (hostBusy()) return;
  t = Math.max(0, Math.min(t, tDuration()));
  if (hasMedia()) media.currentTime = t;
  else player.seek(t);
  markDirty();
}

function applyRate() {
  media.playbackRate = state.rate;
  const keep = settings.keepPitch;
  if ('preservesPitch' in media) media.preservesPitch = keep;
  if ('webkitPreservesPitch' in media) media.webkitPreservesPitch = keep;
  if ('mozPreservesPitch' in media) media.mozPreservesPitch = keep;
}

function setRate(rate) {
  state.rate = rate;
  player.setRate(rate);
  applyRate();
  $('tempo').value = Math.round(rate * 100);
  $('tempoLabel').textContent = `${Math.round(rate * 100)}%`;
}

function updateTransposeUI() {
  player.transpose = state.transpose;
  $('transposeLabel').textContent = state.transpose > 0 ? `+${state.transpose}` : `${state.transpose}`;
}

const fmt = (t) => {
  if (!Number.isFinite(t)) t = 0;
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
};

function updateLoopUI() {
  const { a, b, enabled } = state.loop;
  $('btnLoop').classList.toggle('on', enabled);
  $('loopLabel').textContent = b > a ? `A ${fmt(a)} – B ${fmt(b)}` : a > 0 ? `A ${fmt(a)}` : '';
  document.querySelectorAll('#loopList li').forEach((li, i) => {
    const l = state.loops[i];
    li.classList.toggle('active', enabled && l && Math.abs(l.a - a) < 0.01 && Math.abs(l.b - b) < 0.01);
  });
}

$('btnPlay').onclick = togglePlay;
$('btnStop').onclick = stopAll;
$('btnBack').onclick = () => seek(tTime() - 5);
$('btnFwd').onclick = () => seek(tTime() + 5);
$('btnA').onclick = () => {
  state.loop.a = tTime();
  if (state.loop.b <= state.loop.a) {
    state.loop.b = 0;
    state.loop.enabled = false;
  }
  updateLoopUI();
};
$('btnB').onclick = () => {
  const t = tTime();
  if (t <= state.loop.a + 0.1) {
    toast('Set B after A.');
    return;
  }
  state.loop.b = t;
  state.loop.enabled = true;
  updateLoopUI();
};
$('btnLoop').onclick = () => {
  if (state.loop.b <= state.loop.a) {
    toast('Set A and B first (the A / B buttons mark the current time).');
    return;
  }
  state.loop.enabled = !state.loop.enabled;
  updateLoopUI();
};

let scrubbing = false;
$('scrub').addEventListener('input', () => {
  scrubbing = true;
  $('timeNow').textContent = fmt(($('scrub').value / 1000) * tDuration());
});
$('scrub').addEventListener('change', () => {
  scrubbing = false;
  seek(($('scrub').value / 1000) * tDuration());
});

$('tempo').addEventListener('input', () => setRate($('tempo').value / 100));
$('tempo').addEventListener('dblclick', () => setRate(1));
$('trDown').onclick = (e) => {
  e.preventDefault();
  state.transpose = Math.max(-12, state.transpose - 1);
  updateTransposeUI();
};
$('trUp').onclick = (e) => {
  e.preventDefault();
  state.transpose = Math.min(12, state.transpose + 1);
  updateTransposeUI();
};
$('keepPitch').addEventListener('change', () => {
  settings.keepPitch = $('keepPitch').checked;
  applyRate();
  saveSettings();
});
$('btnSplit').onclick = () => {
  liveAllOff();
  settings.split.enabled = !settings.split.enabled;
  $('btnSplit').classList.toggle('on', settings.split.enabled);
  saveSettings();
  markDirty();
};

// Recording
$('btnRec').onclick = () => {
  synth.ensure();
  if (!state.recording) {
    state.recording = { events: [], t0: performance.now(), media: hasMedia() };
    $('btnRec').classList.add('on');
    if (hasMedia() && media.paused) media.play().catch(() => {});
    toast(hasMedia() ? 'Recording — play along with the media. Your notes will be synced to it.' : 'Recording — play your keyboard.');
    return;
  }
  const r = state.recording;
  // Close any notes still held.
  for (const m of liveMap.values()) record([0x80, m.note, 0]);
  if (liveCtl.sustain) record([0xb0, 64, 0]);
  state.recording = null;
  $('btnRec').classList.remove('on');
  if (!r.events.some((e) => (e.bytes[0] & 0xf0) === 0x90)) {
    toast('Nothing was recorded.');
    return;
  }
  // Start wall-clock recordings at the first note.
  if (!r.media) {
    const first = Math.min(...r.events.map((e) => e.time));
    r.events.forEach((e) => (e.time -= Math.max(0, first - 0.2)));
  }
  const bytes = writeMidi(r.events);
  state.lastRecording = bytes;
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  toast('Recording ready.', [
    ['Download .mid', () => download(bytes, `knight-keys-${stamp}.mid`, 'audio/midi')],
    [r.media ? 'Use as lesson MIDI' : 'Open it', () => loadMidiBytes(bytes, `Recording ${stamp}.mid`)],
  ], 15000);
};

// ---- Mixer ---------------------------------------------------------------

function presetOptions(select, value, withAuto) {
  select.innerHTML = '';
  if (withAuto) select.append(new Option('Auto (GM)', ''));
  for (const [key, p] of Object.entries(PRESETS)) select.append(new Option(p.label, key));
  select.value = value || '';
}

function channelName(ch) {
  if (state.channelLabels && state.channelLabels.for === state.midiName && state.channelLabels[ch]) return state.channelLabels[ch];
  if (ch === DRUM_CHANNEL) return 'Drums';
  if (state.librarySong && ch <= 1) return state.libraryChart ? (ch === 0 ? 'Chords (right hand)' : 'Bass (left hand)') : ch === 0 ? 'Melody (right hand)' : 'Chords (left hand)';
  return GM_NAMES[state.chan[ch].program] || `Program ${state.chan[ch].program}`;
}

function buildMixer() {
  const root = $('mixer');
  root.innerHTML = '';

  const live = document.createElement('div');
  live.className = 'mix-row live';
  const liveColorIn = Object.assign(document.createElement('input'), { type: 'color', value: settings.inputColor, title: 'My playing color' });
  liveColorIn.oninput = () => {
    settings.inputColor = liveColorIn.value;
    $('inputColor').value = liveColorIn.value;
    saveSettings();
    markDirty();
  };
  const liveVol = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1.5, step: 0.01, value: settings.liveMix, title: 'My volume' });
  liveVol.oninput = () => {
    settings.liveMix = Number(liveVol.value);
    synth.setMix(LIVE_CHANNEL, settings.liveMix);
    synth.setMix(LIVE_LEFT_CHANNEL, settings.liveMix);
    saveSettings();
  };
  const liveSel = document.createElement('select');
  presetOptions(liveSel, settings.liveInstrument, false);
  liveSel.onchange = () => {
    settings.liveInstrument = liveSel.value;
    $('liveInstrument').value = liveSel.value;
    applyLiveInstruments();
    saveSettings();
  };
  const lbl = document.createElement('span');
  lbl.className = 'ch';
  lbl.textContent = 'IN';
  const nm = document.createElement('span');
  nm.className = 'name';
  nm.textContent = 'My playing';
  live.append(liveColorIn, lbl, nm, document.createElement('span'), document.createElement('span'), liveVol, liveSel);
  root.append(live);

  if (!state.song) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Load a MIDI file to see its channels. Mute, solo, recolor or change the sound of each part.';
    root.append(p);
    return;
  }

  for (const ch of state.song.channels) {
    const c = state.chan[ch];
    const row = document.createElement('div');
    row.className = 'mix-row';
    row.dataset.ch = ch;
    const color = Object.assign(document.createElement('input'), { type: 'color', value: c.color, title: 'Key color' });
    color.oninput = () => {
      c.color = color.value;
      markDirty();
    };
    const num = document.createElement('span');
    num.className = 'ch';
    num.innerHTML = `<span class="meter"></span>${ch + 1}`;
    num.style.display = 'flex';
    num.style.gap = '4px';
    num.style.alignItems = 'center';
    num.style.justifyContent = 'flex-end';
    const name = document.createElement('span');
    name.className = 'name';
    const tn = state.song.trackNames.filter(Boolean);
    name.textContent = channelName(ch);
    name.title = tn.join(', ');
    const m = Object.assign(document.createElement('button'), { textContent: 'M', title: 'Mute', className: 'm' + (c.mute ? ' on' : '') });
    m.onclick = () => {
      c.mute = !c.mute;
      m.classList.toggle('on', c.mute);
      applyMutes();
    };
    const s = Object.assign(document.createElement('button'), { textContent: 'S', title: 'Solo', className: 's' + (c.solo ? ' on' : '') });
    s.onclick = () => {
      c.solo = !c.solo;
      s.classList.toggle('on', c.solo);
      applyMutes();
    };
    const vol = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1.5, step: 0.01, value: c.mix, title: 'Volume' });
    vol.oninput = () => {
      c.mix = Number(vol.value);
      synth.setMix(ch, c.mix);
    };
    synth.setMix(ch, c.mix);
    const sel = document.createElement('select');
    presetOptions(sel, c.preset, true);
    sel.disabled = ch === DRUM_CHANNEL;
    sel.title = 'Built-in sound';
    sel.onchange = () => {
      c.preset = sel.value;
      synth.setPresetOverride(ch, c.preset);
    };
    row.append(color, num, name, m, s, vol, sel);
    root.append(row);
  }
  applyMutes();
}

function updateMixerNames() {
  document.querySelectorAll('.mix-row[data-ch]').forEach((row) => {
    row.querySelector('.name').textContent = channelName(Number(row.dataset.ch));
  });
}

function updateMeters() {
  document.querySelectorAll('.mix-row[data-ch]').forEach((row) => {
    const s = sources.get(Number(row.dataset.ch));
    row.querySelector('.meter')?.classList.toggle('lit', !!s && s.down.size > 0);
  });
}

function applyLiveInstruments() {
  synth.setPresetOverride(LIVE_CHANNEL, settings.liveInstrument);
  synth.setPresetOverride(LIVE_LEFT_CHANNEL, settings.split.leftInstrument);
  synth.setMix(LIVE_CHANNEL, settings.liveMix);
  synth.setMix(LIVE_LEFT_CHANNEL, settings.liveMix);
}

// ---- Loops panel ---------------------------------------------------------

function renderLoops() {
  const list = $('loopList');
  list.innerHTML = '';
  state.loops.forEach((l, i) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'lname';
    name.textContent = l.name;
    const range = document.createElement('span');
    range.className = 'mono small';
    range.textContent = `${fmt(l.a)}–${fmt(l.b)}`;
    const del = Object.assign(document.createElement('button'), { textContent: '✕', title: 'Delete loop', className: 'mini' });
    del.onclick = (e) => {
      e.stopPropagation();
      state.loops.splice(i, 1);
      renderLoops();
    };
    li.onclick = () => {
      Object.assign(state.loop, { a: l.a, b: l.b, enabled: true });
      seek(l.a);
      updateLoopUI();
    };
    li.ondblclick = () => {
      const n = prompt('Loop name', l.name);
      if (n) {
        l.name = n;
        renderLoops();
      }
    };
    li.append(name, range, del);
    list.append(li);
  });
  updateLoopUI();
}

$('btnAddLoop').onclick = () => {
  const { a, b } = state.loop;
  if (b <= a) {
    toast('Set A and B in the transport bar first.');
    return;
  }
  state.loops.push({ name: `Loop ${state.loops.length + 1}`, a, b });
  renderLoops();
};

// ---- Panels: detach, move, resize, recolor, hide -------------------------

const workspace = $('workspace');
const panels = [...document.querySelectorAll('.panel')];
// Video/audio stays out of the way until a media file is opened.
const defaultLayout = () => Object.fromEntries(panels.map((p) => [p.dataset.panel, { hidden: p.dataset.panel === 'media', floating: false }]));
let layout = { ...defaultLayout(), ...load('kk.layout', {}) };
const saveLayout = () => save('kk.layout', layout);

panels.forEach((panel, order) => {
  const id = panel.dataset.panel;
  panel.dataset.order = order;
  panel.homeRow = panel.parentElement;
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<span class="title">${panel.dataset.title}</span>
    <button data-act="color" title="Colors">🎨</button>
    <button data-act="top" title="Always on top" hidden>📌</button>
    <button data-act="float" title="Detach / dock">⧉</button>
    <button data-act="hide" title="Hide panel">✕</button>`;
  panel.prepend(head);

  head.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'float') setFloating(panel, !panel.classList.contains('floating'));
    else if (act === 'hide') showPanel(id, false);
    else if (act === 'top') {
      const on = !panel.classList.contains('on-top');
      panel.classList.toggle('on-top', on);
      e.target.classList.toggle('on', on);
      layout[id].onTop = on;
      saveLayout();
    } else if (act === 'color') toggleColorPop(panel);
  });

  // Dragging floating panels by their header.
  head.addEventListener('pointerdown', (e) => {
    if (!panel.classList.contains('floating') || e.target.closest('button')) return;
    const ws = workspace.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, left: panel.offsetLeft, top: panel.offsetTop };
    head.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const left = Math.max(0, Math.min(ws.width - 60, start.left + ev.clientX - start.x));
      const top = Math.max(0, Math.min(ws.height - 30, start.top + ev.clientY - start.y));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    };
    const up = () => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', up);
      rememberRect(panel);
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up);
  });

  // Double-click a panel body to hide its header (cleaner for streaming).
  panel.addEventListener('dblclick', (e) => {
    if (e.target.closest('.panel-head, button, input, select, .loop-list, video')) return;
    if (!panel.classList.contains('floating')) return;
    panel.classList.toggle('chromeless');
  });
});

function rememberRect(panel) {
  const l = layout[panel.dataset.panel];
  Object.assign(l, { x: panel.offsetLeft, y: panel.offsetTop, w: panel.offsetWidth, h: panel.offsetHeight });
  saveLayout();
}

function dock(panel) {
  const row = panel.homeRow;
  const order = Number(panel.dataset.order);
  const next = [...row.children].find((c) => Number(c.dataset.order) > order);
  row.insertBefore(panel, next || null);
}

function setFloating(panel, on, rect) {
  const id = panel.dataset.panel;
  const l = layout[id];
  if (on) {
    const ws = workspace.getBoundingClientRect();
    const r = panel.getBoundingClientRect();
    const box = rect || { x: r.left - ws.left + 20, y: r.top - ws.top + 20, w: r.width, h: r.height };
    workspace.append(panel);
    panel.classList.add('floating');
    Object.assign(panel.style, {
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${Math.max(160, box.w)}px`,
      height: `${Math.max(90, box.h)}px`,
    });
    clampFloating(panel);
    panel.classList.toggle('on-top', !!l.onTop);
  } else {
    panel.classList.remove('floating', 'on-top', 'chromeless');
    ['left', 'top', 'width', 'height'].forEach((k) => (panel.style[k] = ''));
    dock(panel);
  }
  const topBtn = panel.querySelector('[data-act="top"]');
  topBtn.hidden = !on;
  topBtn.classList.toggle('on', !!l.onTop);
  l.floating = on;
  if (on) rememberRect(panel);
  else saveLayout();
  updateRows();
  markDirty();
}

/** Keep a floating panel fully inside the workspace. */
function clampFloating(panel) {
  const ws = workspace.getBoundingClientRect();
  const w = Math.min(panel.offsetWidth, ws.width);
  const h = Math.min(panel.offsetHeight, ws.height);
  if (w < panel.offsetWidth) panel.style.width = `${w}px`;
  if (h < panel.offsetHeight) panel.style.height = `${h}px`;
  panel.style.left = `${Math.max(0, Math.min(panel.offsetLeft, ws.width - w))}px`;
  panel.style.top = `${Math.max(0, Math.min(panel.offsetTop, ws.height - h))}px`;
}

function showPanel(id, show) {
  const panel = panels.find((p) => p.dataset.panel === id);
  if (!panel) return;
  panel.classList.toggle('hidden', !show);
  layout[id].hidden = !show;
  saveLayout();
  const cb = document.querySelector(`#panelToggles input[data-id="${id}"]`);
  if (cb) cb.checked = show;
  updateRows();
  markDirty();
}

function updateRows() {
  // If only the keyboard row is docked, let it fill the workspace.
  const docked = (row) => [...row.querySelectorAll(':scope > .panel')].some((p) => !p.classList.contains('hidden'));
  const rows = [...workspace.querySelectorAll('.row-area')];
  rows.forEach((r) => (r.style.display = docked(r) ? '' : 'none'));
  const onlyBottom = !docked(rows[0]) && !docked(rows[1]);
  rows[2].style.flex = onlyBottom ? '1' : '';
}

function toggleColorPop(panel) {
  const existing = panel.querySelector('.color-pop');
  if (existing) {
    existing.remove();
    return;
  }
  const id = panel.dataset.panel;
  const cs = getComputedStyle(panel);
  const toHex = (c) => {
    c = c.trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
    const m = c.match(/\d+/g);
    if (!m) return '#000000';
    return '#' + m.slice(0, 3).map((x) => Number(x).toString(16).padStart(2, '0')).join('');
  };
  const pop = document.createElement('div');
  pop.className = 'color-pop';
  const bg = Object.assign(document.createElement('input'), { type: 'color', value: toHex(cs.getPropertyValue('--panel-bg') || cs.backgroundColor) });
  const fg = Object.assign(document.createElement('input'), { type: 'color', value: toHex(cs.getPropertyValue('--panel-fg') || cs.color) });
  const reset = Object.assign(document.createElement('button'), { textContent: 'Reset', className: 'mini' });
  bg.oninput = () => applyPanelColors(panel, { bg: bg.value });
  fg.oninput = () => applyPanelColors(panel, { fg: fg.value });
  reset.onclick = () => {
    delete layout[id].bg;
    delete layout[id].fg;
    panel.style.removeProperty('--panel-bg');
    panel.style.removeProperty('--panel-fg');
    saveLayout();
    pop.remove();
    markDirty();
  };
  pop.append('Background', bg, 'Text / notes', fg, reset);
  panel.append(pop);
}

function applyPanelColors(panel, { bg, fg }) {
  const l = layout[panel.dataset.panel];
  if (bg) {
    panel.style.setProperty('--panel-bg', bg);
    l.bg = bg;
  }
  if (fg) {
    panel.style.setProperty('--panel-fg', fg);
    l.fg = fg;
  }
  saveLayout();
  markDirty();
}

function applyLayout() {
  for (const panel of panels) {
    const id = panel.dataset.panel;
    const l = (layout[id] = { hidden: false, floating: false, ...(layout[id] || {}) });
    panel.classList.toggle('hidden', !!l.hidden);
    if (l.bg || l.fg) applyPanelColors(panel, { bg: l.bg, fg: l.fg });
    else {
      panel.style.removeProperty('--panel-bg');
      panel.style.removeProperty('--panel-fg');
    }
    if (l.floating) setFloating(panel, true, l.x !== undefined ? { x: l.x, y: l.y, w: l.w, h: l.h } : undefined);
    else if (panel.classList.contains('floating')) setFloating(panel, false);
  }
  const toggles = $('panelToggles');
  toggles.innerHTML = '';
  for (const panel of panels) {
    const id = panel.dataset.panel;
    const label = document.createElement('label');
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !layout[id].hidden });
    cb.dataset.id = id;
    cb.onchange = () => showPanel(id, cb.checked);
    label.append(cb, panel.dataset.title);
    toggles.append(label);
  }
  updateRows();
  markDirty();
}

const LAYOUTS = {
  full: ['score', 'chord', 'mixer', 'drums', 'media', 'loops', 'keyboard', 'controls'],
  keys: ['keyboard', 'controls', 'chord'],
  score: ['score', 'chord', 'keyboard', 'controls'],
  video: ['media', 'chord', 'keyboard'],
  drums: ['score', 'chord', 'drums', 'keyboard', 'controls'],
};
document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.onclick = () => {
    const show = LAYOUTS[btn.dataset.layout];
    for (const panel of panels) {
      if (panel.classList.contains('floating')) setFloating(panel, false);
      showPanel(panel.dataset.panel, show.includes(panel.dataset.panel));
    }
    $('viewMenu').open = false;
  };
});
$('btnResetLayout').onclick = () => {
  layout = defaultLayout();
  saveLayout();
  applyLayout();
};
$('btnFullscreen').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
};

// Panels resized by the user (CSS resize) → remember size and redraw.
const ro = new ResizeObserver((entries) => {
  markDirty();
  for (const e of entries) {
    if (e.target.classList?.contains('floating')) rememberRect(e.target);
  }
});
panels.forEach((p) => ro.observe(p));

// ---- Settings dialog -----------------------------------------------------

function fillKeySelect() {
  const sel = $('keySel');
  sel.innerHTML = '';
  const auto = state.song?.keySig ? `Auto (${keyName(state.song.keySig.sf, state.song.keySig.minor)})` : 'Auto (from file)';
  sel.append(new Option(auto, 'auto'));
  for (let sf = -7; sf <= 7; sf++) {
    const count = sf === 0 ? '' : ` · ${Math.abs(sf)}${sf > 0 ? '♯' : '♭'}`;
    sel.append(new Option(`${keyName(sf).replace(' major', '')} / ${keyName(sf, true)}${count}`, String(sf)));
  }
  sel.value = settings.key;
}

function syncSettingsUI() {
  const s = settings;
  fillKeySelect();
  $('spellSel').value = s.spelling;
  $('master').value = s.master;
  $('fwdInput').checked = s.fwdInput;
  $('fwdPlayback').checked = s.fwdPlayback;
  $('internalSynth').checked = s.internalSynth;
  $('lessonMidiSound').checked = s.lessonMidiSound;
  $('kbRange').value = s.kbRange;
  $('kbShift').value = s.kbShift;
  $('kbStyle').value = s.kbStyle;
  $('kbLabels').value = s.kbLabels;
  $('cMarkers').checked = s.cMarkers;
  $('sustainHold').checked = s.sustainHold;
  $('showWheels').checked = s.showWheels;
  $('showPedals').checked = s.showPedals;
  $('inputColor').value = s.inputColor;
  presetOptions($('liveInstrument'), s.liveInstrument, false);
  presetOptions($('leftInstrument'), s.split.leftInstrument, false);
  $('pianoQuality').value = s.pianoQuality;
  updatePianoStatus();
  $('splitPoint').value = s.split.point;
  $('leftColor').value = s.split.leftColor;
  $('rightColor').value = s.split.rightColor;
  $('leftOctave').value = s.split.leftOctave;
  $('rightOctave').value = s.split.rightOctave;
  $('splitSound').checked = s.split.splitSound;
  $('solfegeMode').value = s.solfege;
  $('chordSource').value = s.chordSource;
  $('workspaceBg').value = s.workspaceBg;
  $('lessonOffset').value = s.lessonOffset;
  $('keepPitch').checked = s.keepPitch;
  $('btnSplit').classList.toggle('on', s.split.enabled);
  workspace.style.setProperty('--workspace-bg', s.workspaceBg);
}

const splitSel = $('splitPoint');
for (let n = 36; n <= 84; n++) splitSel.append(new Option(`${noteName(n, 0)}${n === 60 ? ' (middle C)' : ''}`, n));

function bind(id, apply, prop = 'value') {
  const el = $(id);
  el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
    let v = el[prop];
    if (el.type === 'number') v = Number(v) || 0;
    apply(v);
    saveSettings();
    markDirty();
  });
}

bind('keySel', (v) => (settings.key = v));
bind('spellSel', (v) => (settings.spelling = v));
bind('master', (v) => {
  settings.master = Number(v);
  synth.setMaster(settings.master);
});
bind('midiIn', (v) => {
  settings.inputId = v;
  liveAllOff();
  fillDeviceSelects();
});
bind('midiOut', (v) => {
  outputAllOff();
  settings.outputId = v;
  fillDeviceSelects();
});
bind('fwdInput', (v) => (settings.fwdInput = v), 'checked');
bind('fwdPlayback', (v) => (settings.fwdPlayback = v), 'checked');
bind('internalSynth', (v) => (settings.internalSynth = v), 'checked');
bind('lessonMidiSound', (v) => {
  settings.lessonMidiSound = v;
  if (!v) synth.allNotesOff();
}, 'checked');
bind('kbRange', (v) => (settings.kbRange = v));
bind('kbShift', (v) => (settings.kbShift = Math.max(-3, Math.min(3, v))));
bind('kbStyle', (v) => (settings.kbStyle = v));
bind('kbLabels', (v) => (settings.kbLabels = v));
bind('cMarkers', (v) => (settings.cMarkers = v), 'checked');
bind('sustainHold', (v) => (settings.sustainHold = v), 'checked');
bind('showWheels', (v) => (settings.showWheels = v), 'checked');
bind('showPedals', (v) => (settings.showPedals = v), 'checked');
bind('inputColor', (v) => {
  settings.inputColor = v;
  buildMixer();
});
bind('liveInstrument', (v) => {
  settings.liveInstrument = v;
  applyLiveInstruments();
  buildMixer();
});
bind('pianoQuality', (v) => {
  settings.pianoQuality = v;
  synth.setPianoQuality(resolvePianoQuality());
  updatePianoStatus();
});
bind('leftInstrument', (v) => {
  settings.split.leftInstrument = v;
  applyLiveInstruments();
});
bind('splitPoint', (v) => {
  liveAllOff();
  settings.split.point = Number(v);
});
bind('leftColor', (v) => (settings.split.leftColor = v));
bind('rightColor', (v) => (settings.split.rightColor = v));
bind('leftOctave', (v) => {
  liveAllOff();
  settings.split.leftOctave = Math.max(-3, Math.min(3, v));
});
bind('rightOctave', (v) => {
  liveAllOff();
  settings.split.rightOctave = Math.max(-3, Math.min(3, v));
});
bind('splitSound', (v) => {
  liveAllOff();
  settings.split.splitSound = v;
}, 'checked');
bind('solfegeMode', (v) => (settings.solfege = v));
bind('chordSource', (v) => (settings.chordSource = v));
bind('workspaceBg', (v) => {
  settings.workspaceBg = v;
  workspace.style.setProperty('--workspace-bg', v);
});
bind('lessonOffset', (v) => (settings.lessonOffset = v));

$('btnSettings').onclick = () => $('settingsDlg').showModal();
$('btnPanic').onclick = panic;
$('btnOpen').onclick = () => $('fileInput').click();
$('fileInput').addEventListener('change', (e) => {
  handleFiles([...e.target.files]);
  e.target.value = '';
});
$('btnSaveLesson').onclick = () => saveLesson().catch((err) => toast(`Couldn't save: ${err.message}`));

// Drag & drop anywhere
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
  dragDepth++;
  $('dropOverlay').hidden = false;
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $('dropOverlay').hidden = true;
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('dropOverlay').hidden = true;
  if (e.dataTransfer?.files?.length) handleFiles([...e.dataTransfer.files]);
});

function panic() {
  stopGroove();
  synth.panic();
  player.active.clear();
  visualQueue = [];
  liveMap.clear();
  kbDown.clear();
  pointerNotes.clear();
  for (const s of sources.values()) {
    s.down.clear();
    s.sustained.clear();
    s.sustain = false;
  }
  Object.assign(liveCtl, { bend: 0, mod: 0, sustain: false, sostenuto: false, soft: false });
  Object.assign(lastWheel, { bend: 0, mod: 0 });
  playCtl.forEach((c) => Object.assign(c, { sustain: false, sostenuto: false, soft: false }));
  outputAllOff();
  if (midiOut) for (let ch = 0; ch < 16; ch++) sendOut([0xb0 | ch, 120, 0]);
  markDirty();
  toast('All notes off.');
}

// ---- Toasts --------------------------------------------------------------

let toastTimer = null;
function toast(message, actions = [], ms = 3500) {
  const el = $('toast');
  el.innerHTML = '';
  el.append(message);
  for (const [label, fn] of actions) {
    const b = Object.assign(document.createElement('button'), { textContent: label });
    b.onclick = () => {
      fn();
      el.hidden = true;
    };
    el.append(b);
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

// ---- Drum pads & grooves --------------------------------------------------

const PADS = [
  [49, 'Crash'], [51, 'Ride'], [53, 'Ride bell'], [54, 'Tamb.'],
  [46, 'Open hat'], [42, 'Hi-hat'], [44, 'Pedal hat'], [39, 'Clap'],
  [50, 'High tom'], [47, 'Mid tom'], [45, 'Low tom'], [41, 'Floor tom'],
  [36, 'Kick'], [38, 'Snare'], [37, 'Side stick'], [56, 'Cowbell'],
];
// Other General MIDI drum notes light up the nearest pad.
// Includes the extra notes e-kits send (Alesis Nitro Max: 48 tom 1, 43/58 floor tom, 22/26 hi-hat edges, 59 ride edge).
const PAD_ALIAS = { 35: 36, 40: 38, 48: 50, 43: 41, 58: 41, 22: 42, 26: 46, 57: 49, 52: 49, 55: 49, 59: 51 };
const PAD_COLORS = { 36: '#ff7a45', 38: '#4f8cff', 37: '#40a9ff', 39: '#5cdbd3', 42: '#fadb14', 44: '#d3f261', 46: '#ffa940', 49: '#f759ab', 51: '#b37feb', 53: '#9254de', 54: '#73d13d', 56: '#95de64', 50: '#36cfc9', 47: '#36cfc9', 45: '#13c2c2', 41: '#08979c' };
const padColor = (note) => PAD_COLORS[PAD_ALIAS[note] ?? note] || '#8c8c8c';
const padEls = new Map();

const groove = new GroovePlayer({
  now: () => synth.now,
  hit(note, vel, at) {
    synth.noteOn(GROOVE_CHANNEL, note, vel, at);
    atTime(at, () => flashPad(note, vel), true);
  },
  step(step, inFill, at) {
    atTime(at, () => {
      grooveView.step = step;
      grooveView.inFill = inFill;
      markDirty();
    }, true);
  },
});
const grooveView = { step: -1, inFill: false };

function flashPad(note, vel) {
  kitFlash(note);
  const el = padEls.get(PAD_ALIAS[note] ?? note);
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth; // restart the animation
  el.classList.add('hit');
}

function liveDrum(note, vel) {
  synth.ensure();
  synth.noteOn(GROOVE_CHANNEL, note, vel);
  record([0x99, note, vel]);
  record([0x89, note, 0]);
  if (settings.fwdInput) sendOut([0x99, note, vel]);
  flashPad(note, vel);
  const lane = laneOf(note);
  if (lane >= 0) highwayHits[lane] = performance.now() / 1000;
  learnCheck(note, true);
  stageHit(note, true);
  lessonDrumHit(note);
}

function toggleGroove() {
  if (groove.playing) stopGroove();
  else {
    synth.ensure();
    groove.start();
    $('grooveStart').classList.add('on');
    $('grooveStart').textContent = '■ Stop';
    if (groove.locked && !isPlaying()) {
      toast(state.song || !hostSync() ? 'Groove is ready. It plays along when the song plays.' : 'Groove is ready. It plays when you press Play in Logic.');
    }
  }
}

/** Lock to the song when one is loaded (or to Logic's beat in the plug-in); otherwise the groove free-runs. */
function updateGrooveLock() {
  const locked = !!settings.groove.lock && (!!state.song || hostSync());
  groove.setLocked(locked);
  if (!locked && groove.playing) {
    synth.cancelOneShots(synth.now, GROOVE_CHANNEL);
    visualQueue = visualQueue.filter((e) => !e.groove);
  }
  $('grooveBpm').disabled = locked;
  $('grooveMatch').disabled = locked;
  $('grooveBpm').title = locked ? (state.song ? "Following the song's tempo" : "Following Logic's tempo") : 'Groove tempo';
  if (!locked) $('grooveBpm').value = groove.bpm;
  updateGrooveInfo();
}

function stopGroove() {
  groove.stop();
  if (synth.ctx || IN_HOST) synth.cancelOneShots(synth.now, GROOVE_CHANNEL);
  visualQueue = visualQueue.filter((e) => !e.groove);
  grooveView.step = -1;
  grooveView.inFill = false;
  $('grooveStart').classList.remove('on');
  $('grooveStart').textContent = '▶ Groove';
  updateGrooveInfo();
  markDirty();
}

function updateGrooveInfo() {
  const g = groove.pending || groove.groove;
  const lock = !groove.locked ? '' : state.song ? `🔗 Locked to the song's beat${hostSync() ? ' (in time with Logic)' : ''}. ` : "🔗 Locked to Logic's beat. ";
  setText($('grooveInfo'), `${lock}${g.feel}. ${g.about}`);
  $('grooveInfo').title = $('grooveInfo').textContent;
}

function saveGroove() {
  Object.assign(settings.groove, {
    id: (groove.pending || groove.groove).id,
    bpm: groove.bpm,
    intensity: groove.intensity,
    autoFill: groove.autoFill,
  });
  saveSettings();
}

function initDrums() {
  const pads = $('pads');
  for (const [note, label] of PADS) {
    const b = Object.assign(document.createElement('button'), { className: 'pad', textContent: label, title: `${label} (note ${note})` });
    b.style.setProperty('--pad', padColor(note));
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      liveDrum(note, 70 + Math.round(50 * Math.min(1, e.pressure || 0.7)));
    });
    padEls.set(note, b);
    pads.append(b);
  }

  const sel = $('grooveSel');
  for (const g of GROOVES) sel.append(new Option(`${g.name} · ${g.bpm} bpm`, g.id));
  const g = settings.groove;
  sel.value = GROOVES.some((x) => x.id === g.id) ? g.id : GROOVES[0].id;
  groove.setGroove(sel.value);
  groove.bpm = g.bpm;
  groove.intensity = g.intensity;
  groove.autoFill = Number(g.autoFill) || 0;
  $('grooveBpm').value = g.bpm;
  $('grooveIntensity').value = g.intensity;
  $('grooveAutoFill').value = String(groove.autoFill);
  $('grooveVol').value = g.volume;
  $('grooveLock').checked = !!g.lock;
  $('grooveLock').onchange = () => {
    settings.groove.lock = $('grooveLock').checked;
    saveSettings();
    updateGrooveLock();
    if (settings.groove.lock && !state.song) toast('Lock is on: load a MIDI song and the groove will follow its beat.');
  };
  synth.setMix(GROOVE_CHANNEL, g.volume);
  updateGrooveInfo();

  $('followHostWrap').hidden = !IN_HOST;
  $('followHost').checked = !!settings.followHost;
  $('followHost').onchange = () => {
    settings.followHost = $('followHost').checked;
    saveSettings();
    followHost();
    updateGrooveLock();
  };

  sel.onchange = () => {
    const compiled = groove.setGroove(sel.value);
    groove.bpm = compiled.bpm;
    $('grooveBpm').value = compiled.bpm;
    updateGrooveInfo();
    saveGroove();
    markDirty();
  };
  $('grooveStart').onclick = toggleGroove;
  $('drumView').onclick = () => setDrumView(settings.drumView === 'highway' ? 'grid' : 'highway');
  setDrumView(settings.drumView === 'highway' ? 'highway' : 'grid');
  $('grooveFill').onclick = () => {
    if (!groove.playing) toggleGroove();
    else groove.fill();
  };
  $('grooveBpm').addEventListener('change', () => {
    groove.bpm = Math.max(40, Math.min(240, Number($('grooveBpm').value) || 90));
    $('grooveBpm').value = groove.bpm;
    saveGroove();
  });
  $('grooveMatch').onclick = () => {
    if (!state.song) {
      toast('Load a MIDI file first, then match its tempo.');
      return;
    }
    groove.bpm = Math.round(state.song.bpm * state.rate);
    $('grooveBpm').value = groove.bpm;
    saveGroove();
  };
  $('grooveIntensity').onchange = () => {
    groove.intensity = $('grooveIntensity').value;
    saveGroove();
  };
  $('grooveAutoFill').onchange = () => {
    groove.autoFill = Number($('grooveAutoFill').value);
    saveGroove();
  };
  $('grooveVol').oninput = () => {
    settings.groove.volume = Number($('grooveVol').value);
    synth.setMix(GROOVE_CHANNEL, settings.groove.volume);
    saveSettings();
  };
  updateGrooveLock();
}

function renderGroove() {
  if (groove.locked) {
    const hostTempo = hostSync() && (state.hostDriven || !state.song);
    const quarterBpm = hostTempo ? hostClock.bpm : state.song ? state.song.bpmAt(player.time) * state.rate : groove.bpm;
    const bpm = String(Math.round(quarterBpm / (groove.groove.beatUnit || 1)));
    if ($('grooveBpm').value !== bpm) $('grooveBpm').value = bpm;
  }
  drawGroove(
    $('grooveCanvas'),
    groove.playing ? groove.groove : groove.pending || groove.groove,
    { step: grooveView.step, inFill: grooveView.inFill, playing: groove.playing },
    { fg: panelVar('drums', '--panel-fg', '#ccc'), accent: settings.inputColor, fill: '#f759ab', padColor },
  );
}

// ---- Drum highway (falling notes for drums) ------------------------------

const highwayHits = LANES.map(() => -99); // when you last hit each lane (seconds)
let highwayCache = { song: null, notes: [] };

function setDrumView(view) {
  settings.drumView = view;
  saveSettings();
  const hw = view === 'highway';
  document.querySelector('.drum-highway').hidden = !hw;
  document.querySelector('.groove-grid').hidden = hw;
  $('drumView').classList.toggle('on', hw);
  markDirty();
}

function highwayNotes() {
  if (highwayCache.song !== state.song) {
    const notes = [];
    for (const e of state.song?.events || []) {
      if (e.type !== 'on' || e.ch !== DRUM_CHANNEL) continue;
      const lane = laneOf(e.note);
      if (lane >= 0) notes.push({ t: e.time, lane, vel: e.vel });
    }
    highwayCache = { song: state.song, notes };
  }
  return highwayCache.notes;
}

function renderHighway() {
  const canvas = $('highwayCanvas');
  if (!canvas.offsetParent) return; // hidden
  // At least ~110 px per second so fast hi-hats stay separate in a small panel.
  const ahead = Math.max(0.9, Math.min(2.5, (canvas.clientHeight - 30) / 110));
  const time = state.song ? player.time : 0;
  const all = highwayNotes();
  let lo = 0;
  let hi = all.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (all[mid].t < time - 0.4) lo = mid + 1;
    else hi = mid;
  }
  const notes = [];
  for (let i = lo; i < all.length && all[i].t <= time + ahead; i++) notes.push(all[i]);
  const beats = [];
  if (state.song) {
    for (let b = Math.ceil(state.song.beatAt(Math.max(0, time - 0.4))); beats.length < 64; b++) {
      const t = state.song.secAt(b);
      if (t > time + ahead) break;
      beats.push(t);
    }
  }
  const nowS = performance.now() / 1000;
  const want = new Set(learn.enabled && learn.drums ? [...learn.expected].map(laneOf).filter((l) => l >= 0) : []);
  drawDrumHighway(canvas, {
    lanes: LANES,
    notes,
    time,
    ahead,
    beats,
    want,
    flash: highwayHits.map((t) => nowS - t),
    fg: panelVar('drums', '--panel-fg', '#ccc'),
    bg: '#101218',
    empty: state.song
      ? (all.length ? '' : 'This song has no drum part. Your hits still light up the lanes.')
      : 'Open a song with drums (Songs → 🎯 Learn drums) and the notes fall here. Hit your kit or the pads to try it.',
  });
}

// ---- Kit Rack (drum sampler window) --------------------------------------

const kitSampleNames = {}; // pieceId -> file name of your sample
let kitPiece = 'snare';
let kitSaveTimer = null;

function applyKit() {
  synth.setKit(kitNoteParams(resolveKit(settings.kit.id, settings.kit.custom)));
}

// Per-drum routing for Logic's Multi-Output version (the plug-in also keeps it itself).
function applyRoutes() {
  if (settings.drumRoutes) synth.setRoutes(routeRows(settings.drumRoutes));
}

function setDrumRoutes(routes) {
  settings.drumRoutes = { ...routes };
  applyRoutes();
  saveKitSoon();
  renderKitRoutes();
}

function routeOptions(note) {
  const def = routeOutput(note, ROUTE_DEFAULT);
  const opts = [[ROUTE_DEFAULT, `By drum type: ${outputName(def)} (${logicChannels(def)})`], [ROUTE_MAIN, `Main mix (1-2)`]];
  for (let o = 1; o <= DRUM_OUTPUTS; o++) opts.push([o, `${outputName(o)} (${logicChannels(o)})`]);
  return opts;
}

function renderKitRoutes() {
  const box = $('kitRoutes');
  if (!box) return;
  const routes = settings.drumRoutes || {};
  box.innerHTML = '';
  for (const p of PIECES) {
    const sel = document.createElement('select');
    sel.title = `Logic output for the ${p.name.toLowerCase()}`;
    for (const [v, label] of routeOptions(p.notes[0])) sel.append(new Option(label, v));
    sel.value = String(routes[p.id] ?? ROUTE_DEFAULT);
    sel.onchange = () => {
      const next = { ...(settings.drumRoutes || {}) };
      const v = Number(sel.value);
      if (v === ROUTE_DEFAULT) delete next[p.id];
      else next[p.id] = v;
      setDrumRoutes(next);
    };
    const name = Object.assign(document.createElement('button'), { className: 'kit-route-name', type: 'button', textContent: p.name, title: 'Select and hear this drum' });
    name.onclick = () => {
      kitPiece = p.id;
      renderKitRack();
      auditionPiece(p.id);
    };
    const row = document.createElement('div');
    row.className = `kit-route${p.id === kitPiece ? ' sel' : ''}`;
    row.append(name, sel);
    box.append(row);
  }
  const used = new Set(PIECES.map((p) => routeOutput(p.notes[0], routes[p.id])).filter((o) => o > 0));
  const top = Math.max(0, ...used);
  setText($('kitRouteSum'), used.size ? `In Logic, click + on the channel strip until you reach output ${top} (channels ${logicChannels(top)}).` : 'Every drum plays on the main mix.');
}

function saveKitSoon() {
  clearTimeout(kitSaveTimer);
  kitSaveTimer = setTimeout(saveSettings, 300);
}

function kitFlash(note) {
  if (!$('kitDlg').open) return;
  const piece = PIECES.find((p) => p.notes.includes(note));
  const els = [
    ...(piece ? document.querySelectorAll(`#kitStage .kp[data-piece="${piece.id}"]`) : []),
    ...document.querySelectorAll(`#kitKeys [data-note="${note}"]`),
  ];
  for (const el of els) {
    el.classList.remove('hit');
    void el.getBoundingClientRect();
    el.classList.add('hit');
    setTimeout(() => el.classList.remove('hit'), 140);
  }
}

function auditionPiece(id) {
  const p = PIECES.find((x) => x.id === id);
  if (!p) return;
  synth.ensure();
  synth.noteOn(GROOVE_CHANNEL, p.notes[0], 105);
  flashPad(p.notes[0], 105);
}

function setKnob(el, value) {
  const min = Number(el.dataset.min);
  const max = Number(el.dataset.max);
  const v = Math.max(min, Math.min(max, value));
  el.dataset.v = String(v);
  el.style.setProperty('--a', `${-135 + (270 * (v - min)) / (max - min)}deg`);
  const unit = el.dataset.unit || '';
  el.dataset.value = unit === ' st' ? `${v > 0 ? '+' : ''}${v}${unit}` : `${v.toFixed(2)}${unit}`;
  el.setAttribute('aria-valuenow', String(v));
}

function initKnob(el, onChange, reset) {
  const step = Number(el.dataset.step);
  const range = Number(el.dataset.max) - Number(el.dataset.min);
  const change = (v) => {
    setKnob(el, Math.round(v / step) * step);
    onChange(Number(el.dataset.v));
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const y0 = e.clientY;
    const v0 = Number(el.dataset.v);
    const move = (m) => change(v0 + ((y0 - m.clientY) / 160) * range);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    change(Number(el.dataset.v) + (e.deltaY < 0 ? step : -step));
  }, { passive: false });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') change(Number(el.dataset.v) + step);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') change(Number(el.dataset.v) - step);
    else return;
    e.preventDefault();
    e.stopPropagation();
  });
  el.addEventListener('dblclick', () => change(reset));
}

function renderKitRack() {
  const kit = kitById(settings.kit.id);
  const resolved = resolveKit(settings.kit.id, settings.kit.custom);
  setText($('kitName'), kit.name);
  setText($('kitAbout'), kit.about);
  for (const card of $('kitList').children) card.classList.toggle('on', card.dataset.kit === kit.id);
  const piece = PIECES.find((p) => p.id === kitPiece);
  const v = resolved[kitPiece];
  setText($('kitPieceName'), piece.name);
  const out = routeOutput(piece.notes[0], settings.drumRoutes?.[piece.id]);
  setText($('kitPieceNotes'), `Notes ${piece.notes.join(', ')} · Logic output: ${outputName(out)} (${logicChannels(out)})`);
  setKnob($('knobTune'), v.tune);
  setKnob($('knobDecay'), v.decay);
  setKnob($('knobLevel'), v.level);
  setText($('kitSampleName'), kitSampleNames[kitPiece] ? `🎵 ${kitSampleNames[kitPiece]}` : 'Built-in sound');
  $('kitClear').disabled = !kitSampleNames[kitPiece];
  document.querySelectorAll('#kitStage .kp').forEach((g) => {
    g.classList.toggle('sel', g.dataset.piece === kitPiece);
    g.classList.toggle('custom', !!kitSampleNames[g.dataset.piece]);
  });
  const n = Object.keys(kitSampleNames).length;
  setText($('kitMyCount'), n ? `${n} of your samples` : '');
  renderKitRoutes();
}

async function loadKitSample(pieceId, file) {
  const piece = PIECES.find((p) => p.id === pieceId);
  if (!piece || !file) return;
  if (file.size > 20 * 1024 * 1024) return toast('That file is too big for a drum hit (20 MB max).');
  const bytes = await file.arrayBuffer();
  const ok = await synth.loadDrumSample(piece.notes, bytes, file.name);
  if (!ok) return toast(`Couldn't read "${file.name}" as audio. Try a WAV, AIFF or MP3 file.`);
  kitSampleNames[pieceId] = file.name;
  saveSample(pieceId, file.name, bytes);
  kitPiece = pieceId;
  renderKitRack();
  auditionPiece(pieceId);
  toast(`${piece.name} now plays "${file.name}".`);
}

function initKitRack() {
  const dlg = $('kitDlg');
  $('btnKit').onclick = () => {
    if (!dlg.open) dlg.show();
    renderKitRack();
  };
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  makeDraggable(dlg);

  for (const kit of KITS) {
    const b = document.createElement('button');
    b.className = 'kit-card';
    b.dataset.kit = kit.id;
    b.style.background = `linear-gradient(120deg, ${kit.colors[0]} 0%, ${kit.colors[0]} 45%, ${kit.colors[1]} 140%)`;
    b.innerHTML = '<div class="kc-name"></div><div class="kc-sub"></div>';
    b.querySelector('.kc-name').textContent = kit.name;
    b.querySelector('.kc-sub').textContent = kit.about;
    b.onclick = () => {
      settings.kit = { id: kit.id, custom: {} };
      applyKit();
      saveSettings();
      renderKitRack();
      auditionPiece('kick');
      setTimeout(() => auditionPiece('snare'), 260);
    };
    $('kitList').append(b);
  }

  document.querySelectorAll('#kitStage .kp').forEach((g) => {
    g.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      kitPiece = g.dataset.piece;
      renderKitRack();
      auditionPiece(kitPiece);
    });
  });

  const edit = (key) => (value) => {
    const custom = settings.kit.custom;
    custom[kitPiece] = { ...(custom[kitPiece] || {}), [key]: value };
    applyKit();
    saveKitSoon();
  };
  initKnob($('knobTune'), edit('tune'), 0);
  initKnob($('knobDecay'), edit('decay'), 1);
  initKnob($('knobLevel'), edit('level'), 1);
  for (const id of ['knobTune', 'knobDecay', 'knobLevel']) $(id).addEventListener('pointerup', () => auditionPiece(kitPiece));

  $('kitResetAll').onclick = () => {
    settings.kit.custom = {};
    applyKit();
    saveSettings();
    renderKitRack();
  };
  $('kitLoad').onclick = () => $('kitFile').click();
  $('kitFile').onchange = () => {
    loadKitSample(kitPiece, $('kitFile').files[0]);
    $('kitFile').value = '';
  };
  $('kitClear').onclick = () => {
    const piece = PIECES.find((p) => p.id === kitPiece);
    synth.clearDrumSample(piece.notes);
    delete kitSampleNames[kitPiece];
    deleteSample(kitPiece);
    renderKitRack();
    auditionPiece(kitPiece);
  };

  // Drop audio files straight onto a drum.
  const stage = $('kitStage');
  stage.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stage.classList.add('drop');
  });
  stage.addEventListener('dragleave', () => stage.classList.remove('drop'));
  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stage.classList.remove('drop');
    const target = e.target.closest?.('.kp')?.dataset.piece || kitPiece;
    loadKitSample(target, e.dataTransfer.files[0]);
  });

  // Strip of the drum notes, colored by drum; click to hear one.
  for (let n = 35; n <= 59; n++) {
    const k = document.createElement('div');
    k.className = `kit-key${[1, 3, 6, 8, 10].includes(n % 12) ? ' black' : ''}`;
    k.dataset.note = String(n);
    const lane = laneOf(n);
    if (lane >= 0) k.style.setProperty('--kc', LANES[lane].color);
    const piece = PIECES.find((p) => p.notes.includes(n));
    k.title = `${n}: ${piece ? piece.name : 'percussion'}`;
    k.textContent = String(n);
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      synth.ensure();
      synth.noteOn(GROOVE_CHANNEL, n, 105);
      flashPad(n, 105);
      if (piece) {
        kitPiece = piece.id;
        renderKitRack();
      }
    });
    $('kitKeys').append(k);
  }

  applyKit();
  applyRoutes();
  for (const b of document.querySelectorAll('[data-routes]')) b.onclick = () => setDrumRoutes(ROUTE_PRESETS[b.dataset.routes]);
  loadSavedSamples().then(async (saved) => {
    for (const [id, { name, bytes }] of Object.entries(saved)) {
      const piece = PIECES.find((p) => p.id === id);
      if (piece && (await synth.loadDrumSample(piece.notes, bytes, name))) kitSampleNames[id] = name;
    }
    if (dlg.open) renderKitRack();
    // The plug-in also keeps your samples itself (so they play with this window closed):
    // show those even if this browser storage was cleared.
    queryHostKit((samples, routes) => {
      for (const p of PIECES) {
        const name = samples[p.notes[0]];
        if (name && !kitSampleNames[p.id]) kitSampleNames[p.id] = name;
      }
      // Routing saved in the plug-in wins when this window has none of its own.
      if (!settings.drumRoutes && Object.keys(routes).length) settings.drumRoutes = routesFromHost(routes);
      if (dlg.open) renderKitRack();
    });
  });
}

// ---- Piano Path (guided lessons) -----------------------------------------
//
// Step-by-step lessons: read a tip, play notes or chords with live feedback,
// then a song in Learn mode. Stars per lesson, the next one opens when you
// pass, and a daily practice streak, per player (the Stage players).

const lessonRun = { active: false, lesson: null, stepIdx: 0, step: null, pos: 0, mistakes: 0, stars: [], targets: new Set(), upcoming: null, done: false, readList: [], hint: false, missesHere: 0 };
const NOTE_LETTERS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const noteLetter = (n) => NOTE_LETTERS[n % 12];
const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const starsHtml = (n) => Array.from({ length: 3 }, (_, i) => `<span class="${i < n ? '' : 'off'}">★</span>`).join('');
const lessonProgress = () => ((stage.lessons ??= {})[stage.current] ??= {});

function renderLessonHeader() {
  const sel = $('lpPlayer');
  sel.innerHTML = '';
  for (const p of stage.players) sel.append(new Option(p.name, p.id));
  sel.value = stage.current;
  const streak = currentStreak(stage.practice?.[stage.current], todayStr());
  setText($('lpStreak'), streak ? `🔥 ${streak}-day streak` : '');
}

let lessonCourse = 'piano';
function renderLessonMap() {
  renderLessonHeader();
  const tabs = $('lpCourses');
  tabs.innerHTML = '';
  for (const c of COURSES) {
    const b = Object.assign(document.createElement('button'), { className: `mini${c.id === lessonCourse ? ' on' : ''}`, textContent: `${c.icon} ${c.name}` });
    b.onclick = () => {
      lessonCourse = c.id;
      renderLessonMap();
    };
    tabs.append(b);
  }
  const info = $('lpCourseInfo');
  info.innerHTML = '';
  const course = COURSES.find((c) => c.id === lessonCourse);
  const t = teacherForCourse(lessonCourse);
  info.append(teacherAvatar(t, 26), Object.assign(document.createElement('span'), { textContent: `Taught by ${t.name}${course?.by ? ` · by ${course.by}` : ''}` }));
  const ask = Object.assign(document.createElement('button'), { className: 'mini ask-btn', textContent: `💬 Ask ${t.name}` });
  ask.onclick = () => openAsk(t.id);
  info.append(ask);
  const map = $('lpMap');
  map.innerHTML = '';
  const state0 = pathState(lessonProgress(), lessonCourse);
  const nextId = state0.find((x) => x.unlocked && !x.stars)?.lesson.id;
  for (const unit of unitsFor(lessonCourse)) {
    const sec = Object.assign(document.createElement('div'), { className: 'lp-unit' });
    sec.append(Object.assign(document.createElement('h3'), { textContent: `${unit.icon} ${unit.title}` }));
    const row = Object.assign(document.createElement('div'), { className: 'lp-row' });
    for (const lesson of unit.lessons) {
      const st = state0.find((x) => x.lesson.id === lesson.id);
      const b = Object.assign(document.createElement('button'), { className: `lp-card${st.unlocked ? '' : ' locked'}${lesson.id === nextId ? ' next' : ''}` });
      b.innerHTML = `<div class="lp-name"></div><div class="lp-stars">${st.unlocked ? starsHtml(st.stars) : '🔒'}</div>`;
      b.querySelector('.lp-name').textContent = lesson.title;
      b.onclick = () => (st.unlocked || stage.unlockAll ? startLesson(lesson) : toast('Finish the lesson before this one to open it.'));
      row.append(b);
    }
    sec.append(row);
    map.append(sec);
  }
  showLessonView('map');
}

function showLessonView(view) {
  $('lpMap').hidden = view !== 'map';
  $('lpCourses').hidden = view !== 'map';
  $('lpLesson').hidden = view !== 'lesson';
  $('lpDone').hidden = view !== 'done';
}

function startLesson(lesson) {
  stopLessonSong();
  const base = lesson.base || lesson;
  const video = courseVideos[base.id];
  const run = video && base.steps[0]?.type !== 'video' ? { ...base, base, steps: [{ type: 'video', src: video.src, text: `${teacherForCourse(courseOfLesson(base)).name} teaches this lesson. Watch, then press Next.` }, ...base.steps] } : base;
  Object.assign(lessonRun, { active: true, lesson: run, stars: [], stepIdx: 0 });
  lessonRun.teacher = teacherForCourse(courseOfLesson(base));
  setText($('lpTitle'), lesson.title);
  showLessonView('lesson');
  showLessonStep(0);
}

function stopLessonSong() {
  stopSinging();
  stopFretted();
  if (lessonRun.step?.type === 'song' || lessonRun.step?.type === 'groove') {
    player.silent = null;
    drumRun.judge = null;
    player.pause();
    if (learn.enabled) setLearn(false);
  }
}

function lessonFeedback(text, kind = '') {
  const el = $('lpFeedback');
  el.textContent = text;
  el.className = `lp-feedback ${kind}`;
}

function renderLessonTargets() {
  const step = lessonRun.step;
  const box = $('lpTargets');
  box.innerHTML = '';
  const chip = (label, sub, cls) => {
    const c = Object.assign(document.createElement('div'), { className: `lp-chip ${cls}` });
    c.textContent = label;
    if (sub) c.append(Object.assign(document.createElement('small'), { textContent: sub }));
    box.append(c);
  };
  if (step.type === 'notes') step.notes.forEach((n, i) => chip(noteLetter(n), step.fingers ? `finger ${step.fingers[i]}` : '', i < lessonRun.pos ? 'done' : i === lessonRun.pos ? 'now' : ''));
  else if (step.type === 'chords') step.chords.forEach((c, i) => chip(step.names[i], c.map(noteLetter).join(' '), i < lessonRun.pos ? 'done' : i === lessonRun.pos ? 'now' : ''));
  else if (step.type === 'info' && step.keys) step.keys.forEach((n) => chip(noteLetter(n), '', 'now'));
  else if (step.type === 'fret') step.notes.forEach(([str, fret], i) => chip(noteLetter(fretNote(step.instrument, str, fret)), `${STRING_NAMES[step.instrument][str]} ${fret ? `fret ${fret}` : 'open'}`, i < lessonRun.pos ? 'done' : i === lessonRun.pos && !lessonRun.done ? 'now' : ''));
  else if (step.type === 'strum') step.chords.forEach((c, i) => chip(c, '', i < lessonRun.pos ? 'done' : i === lessonRun.pos && !lessonRun.done ? 'now' : ''));
  else if (step.type === 'chart' && chartRun.timeline) chartRun.timeline.windows.forEach((w, i) => chip(w.symbol, '', chartRun.judge?.passed(chartRun.judge.windows[i]) ? 'done' : i === chartRun.index ? 'now' : ''));
  else if (step.type === 'hits') step.hits.forEach((h, i) => chip([].concat(h).map(drumName).join(' + '), step.sticking?.[i] || '', i < lessonRun.pos ? 'done' : i === lessonRun.pos && !lessonRun.done ? 'now' : ''));
  else if (step.type === 'read') lessonRun.readList.forEach((n, i) => chip(i < lessonRun.pos ? noteLetter(n) : '?', '', i < lessonRun.pos ? 'done' : i === lessonRun.pos && !lessonRun.done ? 'now' : ''));
  else if (step.type === 'sing') step.notes.forEach((n, i) => chip(step.names?.[i] || noteLetter(n), step.names ? noteLetter(n) : '', i < lessonRun.pos ? 'done' : i === lessonRun.pos && !lessonRun.done ? 'now' : ''));
  const dots = $('lpDots');
  dots.innerHTML = lessonRun.lesson.steps.map((_, i) => `<span class="${i < lessonRun.stepIdx ? 'done' : i === lessonRun.stepIdx ? 'now' : ''}"></span>`).join('');
  drawLessonStaff();
  drawLessonFret();
  markDirty();
}

function setLessonTargets() {
  const step = lessonRun.step;
  lessonRun.upcoming = null;
  if (step.type === 'notes') {
    lessonRun.targets = new Set(lessonRun.pos < step.notes.length ? [step.notes[lessonRun.pos]] : []);
    lessonRun.upcoming = step.notes[lessonRun.pos + 1] ?? null;
  } else if (step.type === 'chords') lessonRun.targets = new Set(step.chords[lessonRun.pos] || []);
  else if (step.type === 'info') lessonRun.targets = new Set(step.keys || []);
  else if (step.type === 'sing') lessonRun.targets = new Set(lessonRun.pos < step.notes.length ? [step.notes[lessonRun.pos]] : []);
  else if (step.type === 'fret') lessonRun.targets = new Set(lessonRun.pos < step.notes.length ? [fretNote(step.instrument, ...step.notes[lessonRun.pos])] : []);
  else if (step.type === 'read') lessonRun.targets = new Set(lessonRun.hint && lessonRun.pos < lessonRun.readList.length ? [lessonRun.readList[lessonRun.pos]] : []);
  else lessonRun.targets = new Set();
}

function showLessonStep(i) {
  stopLessonSong();
  const step = lessonRun.lesson.steps[i];
  Object.assign(lessonRun, { stepIdx: i, step, pos: 0, mistakes: 0, quizTries: 0, done: step.type === 'info', hint: false, missesHere: 0, readList: step.type === 'read' ? readNotes(step) : [] });
  setText($('lpText'), (step.type === 'quiz' ? step.question : step.text || '') + (step.type === 'chords' && micListener?.active ? ' (Chords need a USB keyboard or the on-screen keys: the microphone hears one note at a time.)' : ''));
  micListener?.setRange(step.instrument === 'bass' ? 'bass' : 'normal');
  if (step.type === 'fret' || step.type === 'strum' || step.type === 'chart') lessonFeedback(micSupported() ? (step.type === 'chart' ? 'Count-in: one bar of clicks, then play!' : 'Your turn! (Turn on 🎤 so it can hear your guitar.)') : 'Play it on a MIDI keyboard or the keys below (the microphone works in the Knight Lyfe Ultimate app and on the website).');
  else if (step.type === 'hits' || step.type === 'groove') lessonFeedback(step.type === 'hits' ? 'Your turn: hit the drum that\'s lit up.' : step.mode === 'time' ? 'Count-in: one bar of clicks, then play!' : 'The beat waits for each hit. Follow the highway.');
  else lessonFeedback(step.type === 'info' ? '' : step.type === 'song' ? (step.voice ? 'The song is playing. Sing the yellow notes.' : step.noHints ? 'The song is playing. Read the staff and play.' : 'The song is playing. The yellow keys are yours.') : step.type === 'read' ? 'Which note is it? Play it.' : 'Your turn: the yellow key is next.');
  $('lpSing').hidden = step.type !== 'sing' && step.type !== 'range';
  $('lpHear').hidden = step.type !== 'sing';
  setLessonTargets();
  renderLessonTargets();
  $('lpNext').disabled = !lessonRun.done;
  $('lpNext').textContent = i === lessonRun.lesson.steps.length - 1 ? 'Finish ✓' : 'Next ▶';
  renderTeacherCard();
  renderVideoStep(step);
  renderQuizStep(step);
  if (step.type === 'sing' || step.type === 'range' || step.voice) startSinging(step);
  if (step.type === 'groove') startGroove(step);
  if (step.type === 'strum') startStrum(step);
  if (step.type === 'chart') startChart(step);
  if ((step.type === 'fret' || step.type === 'strum' || step.type === 'chart') && micSupported()) toggleMic(true);
  if (step.type === 'song') {
    const song = SONGS.find((s) => s.id === step.song);
    loadSongEntry(song, 'beginner');
    $('learnPart').value = mapPartForSong(step.part);
    setLearn(true);
    player.seek(0);
    player.play();
  }
}

function completeLessonStep(stars) {
  lessonRun.stars[lessonRun.stepIdx] = stars;
  lessonRun.done = true;
  lessonRun.targets = new Set();
  lessonRun.upcoming = null;
  renderLessonTargets();
  lessonFeedback(`Step done! ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, 'good');
  $('lpNext').disabled = false;
  synth.noteOn(LIVE_CHANNEL, 84, 60, synth.now + 0.02);
  synth.noteOff(LIVE_CHANNEL, 84, synth.now + 0.3);
}

/** The lesson's staff: the note to read, or the notes an info step shows. */
function drawLessonStaff() {
  const step = lessonRun.step;
  const cv = $('lpStaff');
  let notes = [];
  if (step?.type === 'read') {
    const n = lessonRun.readList[Math.min(lessonRun.pos, lessonRun.readList.length - 1)];
    if (n !== undefined) notes = [{ midi: n, color: lessonRun.done ? '#73d13d' : '#e6e6e6' }];
  } else if (step?.staff) notes = step.staff.map((midi) => ({ midi, color: '#ffd60a' }));
  cv.hidden = !notes.length && step?.type !== 'read';
  if (cv.hidden) return;
  drawStaff(cv, notes, { sf: step.sf || 0, spelling: 'auto', splitPoint: step.clef === 'bass' ? 61 : 60, fg: '#ddd' });
}

function lessonHit(note) {
  if (!lessonRun.active || lessonRun.done || !$('lessonDlg').open) return;
  const step = lessonRun.step;
  if (step.type === 'fret') {
    const want = fretNote(step.instrument, ...step.notes[lessonRun.pos]);
    // The microphone can hear a string an octave off (overtones): the note name is what counts then.
    if (note === want || (micListener?.active && note % 12 === want % 12)) {
      lessonRun.pos++;
      if (lessonRun.pos >= step.notes.length) {
        setLessonTargets();
        return completeLessonStep(starsForMistakes(lessonRun.mistakes, step.notes.length));
      }
      lessonFeedback(`✓ ${noteLetter(want)}`, 'good');
    } else {
      lessonRun.mistakes++;
      const [str, fret] = step.notes[lessonRun.pos];
      lessonFeedback(`That was ${noteLetter(note)}. Play ${noteLetter(want)}: ${STRING_NAMES[step.instrument][str]} string, ${fret ? `fret ${fret}` : 'open'}.`, 'bad');
    }
    setLessonTargets();
    renderLessonTargets();
    return;
  }
  if (step.type === 'strum') {
    const t = chordTarget(step.chords[lessonRun.pos]);
    const pcs = new Set([...liveNotesDown()].map((n) => n % 12));
    if (t.pcs.every((pc) => pcs.has(pc))) strumHit();
    return;
  }
  if (step.type === 'read') {
    const want = lessonRun.readList[lessonRun.pos];
    // Singers and the mic may be in another octave: the letter is what counts when reading by voice.
    const ok = note === want || (micListener?.active && note % 12 === want % 12);
    if (ok) {
      lessonRun.pos++;
      lessonRun.hint = false;
      lessonRun.missesHere = 0;
      if (lessonRun.pos >= lessonRun.readList.length) {
        setLessonTargets();
        return completeLessonStep(starsForMistakes(lessonRun.mistakes, lessonRun.readList.length));
      }
      lessonFeedback(`✓ ${noteLetter(want)}! Next note…`, 'good');
    } else {
      lessonRun.mistakes++;
      lessonRun.missesHere++;
      if (lessonRun.missesHere >= 2) lessonRun.hint = true;
      lessonFeedback(lessonRun.hint ? `It's ${noteLetter(want)}: the yellow key. Look at where it sits on the staff.` : `That was ${noteLetter(note)}. Look again: count the lines and spaces.`, 'bad');
    }
    setLessonTargets();
    renderLessonTargets();
    return;
  }
  if (step.type === 'notes') {
    const want = step.notes[lessonRun.pos];
    if (note === want) {
      lessonRun.pos++;
      if (lessonRun.pos >= step.notes.length) return completeLessonStep(starsForMistakes(lessonRun.mistakes, step.notes.length));
      lessonFeedback('✓', 'good');
    } else {
      lessonRun.mistakes++;
      lessonFeedback(`That was ${noteLetter(note)}. Find ${noteLetter(want)} (the yellow key).`, 'bad');
    }
    setLessonTargets();
    renderLessonTargets();
  } else if (step.type === 'chords') {
    const chord = step.chords[lessonRun.pos];
    if (!chord.includes(note)) {
      lessonRun.mistakes++;
      lessonFeedback(`${noteLetter(note)} isn't in ${step.names[lessonRun.pos]}: play ${chord.map(noteLetter).join(', ')} together.`, 'bad');
      return;
    }
    const down = liveNotesDown();
    if (chord.every((n) => down.has(n))) {
      lessonRun.pos++;
      if (lessonRun.pos >= step.chords.length) return completeLessonStep(starsForMistakes(lessonRun.mistakes, step.chords.length * 3));
      lessonFeedback(`✓ ${step.names[lessonRun.pos - 1]}! Now ${step.names[lessonRun.pos]}.`, 'good');
      setLessonTargets();
      renderLessonTargets();
    }
  }
}

function lessonSongDone() {
  const acc = Math.round((100 * learn.correct) / Math.max(1, learn.correct + learn.wrong));
  if (learn.enabled) setLearn(false);
  completeLessonStep(starsForAccuracy(acc));
  lessonFeedback(`Song done: ${acc}% of your notes right. ${'★'.repeat(starsForAccuracy(acc))}`, 'good');
}

function finishLesson() {
  const stars = lessonStars(lessonRun.lesson.steps.map((s, i) => (s.type === 'info' ? 0 : lessonRun.stars[i] ?? 1)));
  const prog = lessonProgress();
  const first = !prog[lessonRun.lesson.id];
  prog[lessonRun.lesson.id] = Math.max(prog[lessonRun.lesson.id] || 0, stars);
  stage.practice ??= {};
  stage.practice[stage.current] = updateStreak(stage.practice[stage.current], todayStr());
  saveStage(stage);
  renderLessonHeader();
  lessonRun.active = false;
  lessonRun.targets = new Set();
  const me = stagePlayer();
  setText($('lpDoneTitle'), `${['', 'Lesson passed', 'Great job', 'Perfect'][stars]}, ${me.name}!`);
  $('lpDoneStars').innerHTML = starsHtml(stars);
  const streak = stage.practice[stage.current].streak;
  setText($('lpDoneNote'), `${first ? 'The next lesson is open. ' : ''}🔥 ${streak}-day practice streak${streak > 1 ? ': keep it going tomorrow!' : '. Come back tomorrow to make it 2!'}`);
  const all = unitsFor(courseOfLesson(lessonRun.lesson)).flatMap((u) => u.lessons);
  const next = all[all.findIndex((l) => l.id === lessonRun.lesson.id) + 1];
  $('lpDoneNext').hidden = !next;
  $('lpDoneNext').onclick = () => startLesson(next);
  $('lpDoneAgain').onclick = () => startLesson(lessonRun.lesson.base || lessonRun.lesson);
  [60, 64, 67, 72].forEach((n, i) => {
    synth.noteOn(LIVE_CHANNEL, n, 85, synth.now + 0.1 * i + 0.05);
    synth.noteOff(LIVE_CHANNEL, n, synth.now + 1.2);
  });
  showLessonView('done');
  markDirty();
}

function leaveLesson() {
  stopLessonSong();
  lessonRun.active = false;
  lessonRun.targets = new Set();
  lessonRun.upcoming = null;
  markDirty();
}

// Microphone: notes heard from any piano, keyboard or singer count like keys you played.
let micListener = null;
// In the app the C++ engine listens (the standalone app's mic or audio interface).
const micSupported = () => (IN_HOST ? hostCanListen() : !!navigator.mediaDevices?.getUserMedia);
const showMicOn = (on) => ['lpMic', 'boothMic'].forEach((id) => $(id).classList.toggle('on', on));

/** Singers: a note in any octave counts as the one the song is waiting for. */
function singingNow() {
  return (lessonRun.active && lessonRun.step?.voice) || $('boothDlg').open;
}
function foldForSinger(midi) {
  if (!singingNow() || !learn.enabled) return midi;
  return [...learn.expected].find((n) => n % 12 === midi % 12) ?? midi;
}

async function toggleMic(force) {
  if (micListener?.active) {
    if (force === true) return;
    micListener.stop();
    showMicOn(false);
    toast('Microphone off.');
    return;
  }
  try {
    const ctx = synth.ensure();
    micListener ??= new (IN_HOST ? HostListener : PitchListener)((on, heard) => {
      const midi = on ? foldForSinger(heard) : (micHeld.get(heard) ?? heard);
      if (on) micHeld.set(heard, midi);
      else micHeld.delete(heard);
      if (on) {
        liveColor.set(midi, settings.inputColor);
        dNoteOn('in', midi);
        learnCheck(midi, false);
        stageHit(midi, false);
        lessonHit(midi);
      } else dNoteOff('in', midi);
      markDirty();
    });
    await micListener.start(ctx);
    showMicOn(true);
    for (const fn of pitchSubscribers) micListener.addPitchListener(fn);
    for (const fn of chromaSubscribers) micListener.addChromaListener(fn);
    micListener.setRange(lessonRun.step?.instrument === 'bass' ? 'bass' : 'normal');
    toast(singingNow() || lessonRun.step?.type === 'sing' ? 'Listening 🎤 Sing! Headphones help, so the speakers don\'t sing for you.' : 'Listening 🎤 Play one note at a time. Headphones help, so the speakers don\'t confuse it.');
  } catch (err) {
    toast(`Couldn't use the microphone (${err.message || err.name}). Allow microphone access for this page.`);
  }
}

const micHeld = new Map(); // heard note -> note it counted as (folded octave), for the matching note-off

// Anyone who wants the raw pitch (sing steps, the Vocal Booth) subscribes here,
// before or after the mic starts.
const pitchSubscribers = new Set();
function onPitch(fn) {
  pitchSubscribers.add(fn);
  const off = micListener?.addPitchListener(fn);
  return () => {
    pitchSubscribers.delete(fn);
    off?.();
    micListener?.pitchListeners.delete(fn);
  };
}

// ---- Guitar and bass steps -------------------------------------------------------

const chartRun = { timeline: null, judge: null, timer: 0, index: -1, chroma: null, pitch: null, off: [] };
const strumRun = { count: 0, quietUntil: 0, off: null };

// Chord recognition subscribers (like pitch ones), kept across mic restarts.
const chromaSubscribers = new Set();
function onChroma(fn) {
  chromaSubscribers.add(fn);
  const off = micListener?.addChromaListener(fn);
  return () => {
    chromaSubscribers.delete(fn);
    off?.();
    micListener?.chromaListeners.delete(fn);
  };
}

/** The neck for the current step: the note to play, the chord shape, or what an info step shows. */
function drawLessonFret() {
  const step = lessonRun.step;
  const cv = $('lpFret');
  let opts = null;
  if (step?.type === 'fret' && lessonRun.pos < step.notes.length) {
    const [str, fret] = step.notes[Math.min(lessonRun.pos, step.notes.length - 1)];
    opts = { instrument: step.instrument, dots: fret ? [{ string: str, fret, label: step.fingers?.[lessonRun.pos] || '' }] : [], open: fret ? [] : [str], to: Math.max(5, fret + 1) };
  } else if (step?.type === 'strum' && lessonRun.pos < step.chords.length) opts = shapeOpts(step.chords[lessonRun.pos]);
  else if (step?.type === 'chart' && chartRun.timeline) {
    const w = chartRun.timeline.windows[Math.max(0, chartRun.index)];
    if (step.match === 'root') {
      const [str, fret] = rootPosition('bass', w.bass);
      opts = { instrument: 'bass', title: `${w.symbol}: play ${noteLetter(w.bass)}`, dots: fret ? [{ string: str, fret, label: 'R' }] : [], open: fret ? [] : [str] };
    } else opts = shapeOpts(w.symbol);
  } else if (step?.type === 'info' && step.chord) opts = shapeOpts(step.chord);
  else if (step?.type === 'info' && step.fretboard) {
    const f = step.fretboard;
    opts = { instrument: f.instrument, open: f.open || [], dots: (f.dots || []).map(([string, fret, label]) => ({ string, fret, label })) };
  }
  cv.hidden = !opts;
  if (!opts) return;
  drawFretboard(cv, { strings: TUNINGS[opts.instrument], from: 0, to: opts.to || 5, fg: '#ddd', ...opts });
}

function shapeOpts(symbol) {
  const shape = chordShape(symbol);
  if (!shape) return { instrument: 'guitar', title: `${symbol} (no shape here yet)`, dots: [] };
  const dots = [];
  const open = [];
  const muted = [];
  shape.frets.forEach((f, i) => {
    const string = 6 - i;
    if (f < 0) muted.push(string);
    else if (f === 0) open.push(string);
    else if (!(shape.barre === f && shape.fingers[i] === 1 && i > 1)) dots.push({ string, fret: f, label: shape.fingers[i] || '' });
  });
  return { instrument: 'guitar', title: shape.name === symbol ? symbol : `${symbol} (play ${shape.name})`, dots, open, muted, barre: shape.barre };
}

function strumHit() {
  const step = lessonRun.step;
  strumRun.count = 0;
  strumRun.quietUntil = performance.now() + 700; // one strum is one chord, even if it rings
  lessonRun.pos++;
  if (lessonRun.pos >= step.chords.length) {
    renderLessonTargets();
    return completeLessonStep(starsForMistakes(lessonRun.mistakes, step.chords.length));
  }
  lessonFeedback(`✓ ${step.chords[lessonRun.pos - 1]}! Now ${step.chords[lessonRun.pos]}.`, 'good');
  renderLessonTargets();
}

function startStrum(step) {
  strumRun.count = 0;
  strumRun.off = onChroma((chroma) => {
    if (lessonRun.step !== step || lessonRun.done || !chroma || performance.now() < strumRun.quietUntil) return;
    const t = chordTarget(step.chords[lessonRun.pos]);
    if (chromaMatches(chroma, t.root, t.quality, t.sus ? t.pcs : null, t.notes)) {
      if (++strumRun.count >= 3) strumHit();
    } else strumRun.count = 0;
  });
}

function startChart(step) {
  const tl = chartTimeline({ ...step, name: `Play along: ${lessonRun.lesson.title}` }, SONGS);
  Object.assign(chartRun, { timeline: tl, judge: new ChartJudge(tl.windows), index: -1, chroma: null, pitch: null });
  if (learn.enabled) setLearn(false);
  loadMidiBytes(tl.bytes, `${lessonRun.lesson.title}.mid`);
  chartRun.off = [onChroma((c) => (chartRun.chroma = c)), onPitch((exact) => (chartRun.pitch = exact))];
  // Listen every 30 ms: does what's sounding match the chord of this moment?
  chartRun.timer = setInterval(() => {
    if (!player.playing || !chartRun.judge) return;
    const t = player.time;
    const w = chartRun.judge.current(t);
    const i = w ? chartRun.judge.windows.indexOf(w) : chartRun.index;
    let ok = false;
    if (w) {
      const keys = [...liveNotesDown()].map((n) => n % 12);
      if (step.match === 'root') ok = keys.includes(w.bass) || (chartRun.pitch !== null && ((Math.round(chartRun.pitch) % 12) + 12) % 12 === w.bass);
      else ok = w.pcs.every((pc) => keys.includes(pc)) || (!!chartRun.chroma && chromaMatches(chartRun.chroma, w.root, w.quality, w.sus ? w.pcs : null, w.notes));
      chartRun.judge.frame(t, ok);
    }
    if (i !== chartRun.index) {
      chartRun.index = i;
      renderLessonTargets();
    } else if (w && ok && chartRun.judge.passed(w)) {
      lessonFeedback(`✓ ${w.symbol}`, 'good');
      renderLessonTargets();
    }
  }, 30);
  player.seek(0);
  player.play();
}

function stopFretted() {
  clearInterval(chartRun.timer);
  chartRun.off.forEach((off) => off());
  Object.assign(chartRun, { timer: 0, off: [], judge: null, timeline: null, index: -1 });
  strumRun.off?.();
  strumRun.off = null;
}

function lessonChartDone() {
  const j = chartRun.judge;
  clearInterval(chartRun.timer);
  if (!j) return;
  const acc = j.accuracy;
  renderLessonTargets();
  if (acc < 50) {
    lessonFeedback(`${j.done} of ${j.windows.length} chords heard (${acc}%). Press "Start this step again" and try once more; practice the changes slowly in the lesson before this one.`, 'bad');
    return;
  }
  completeLessonStep(starsForAccuracy(acc));
  lessonFeedback(`${j.done} of ${j.windows.length} chords right (${acc}%). ${'★'.repeat(starsForAccuracy(acc))}`, 'good');
}

// ---- Drum steps ------------------------------------------------------------------

const DRUM_LABEL = { 35: 'Kick', 36: 'Kick', 37: 'Side stick', 38: 'Snare', 40: 'Snare', 42: 'Hi-hat', 44: 'Hi-hat pedal', 46: 'Open hi-hat', 49: 'Crash', 51: 'Ride', 48: 'Tom 1', 50: 'Tom 1', 45: 'Tom 2', 47: 'Tom 2', 43: 'Floor tom', 41: 'Floor tom' };
const drumName = (n) => DRUM_LABEL[n] || `Drum ${n}`;
const drumRun = { judge: null, together: new Map(), lastFeedback: 0 };

/** Pads to light up for the current drum step (on-screen pads use these notes). */
function lessonPadTargets() {
  const step = lessonRun.active && !lessonRun.done ? lessonRun.step : null;
  if (step?.type !== 'hits') return new Set();
  const want = [].concat(step.hits[lessonRun.pos] ?? []);
  return new Set(want.map((n) => PAD_ALIAS[n] ?? n));
}

function lessonDrumHit(note) {
  if (!lessonRun.active || lessonRun.done || !$('lessonDlg').open) return;
  const step = lessonRun.step;
  if (step.type === 'hits') {
    const want = [].concat(step.hits[lessonRun.pos]);
    const match = want.find((n) => sameDrum(n, note));
    if (match === undefined) {
      lessonRun.mistakes++;
      lessonFeedback(`That was the ${drumName(note).toLowerCase()}. Hit the ${want.map(drumName).join(' and the ').toLowerCase()}.`, 'bad');
      return;
    }
    // Drums hit together count if they land within a third of a second.
    const now = performance.now();
    drumRun.together.set(match, now);
    if (want.every((n) => now - (drumRun.together.get(n) ?? -1e9) < 330)) {
      drumRun.together.clear();
      lessonRun.pos++;
      if (lessonRun.pos >= step.hits.length) return completeLessonStep(starsForMistakes(lessonRun.mistakes, step.hits.length));
      lessonFeedback('✓', 'good');
      renderLessonTargets();
    } else lessonFeedback(`Now with the ${want.filter((n) => n !== match).map(drumName).join(' and ').toLowerCase()} at the same time!`);
    return;
  }
  if (step.type === 'groove' && step.mode === 'time' && drumRun.judge && player.playing) {
    const r = drumRun.judge.hit(note, player.time);
    const missed = drumRun.judge.missedBy(player.time);
    lessonFeedback(`${r === 'perfect' ? '⭐ Perfect' : r === 'good' ? '✓ Good' : '✗ Extra hit'} · ${drumRun.judge.hits} hit, ${missed} missed`, r === 'extra' ? 'bad' : 'good');
  }
}

function startGroove(step) {
  const g = grooveMidi(step, `Drums: ${lessonRun.lesson.title}`);
  if (learn.enabled) setLearn(false);
  loadMidiBytes(g.bytes, `${lessonRun.lesson.title}.mid`);
  setDrumView('highway');
  if (step.mode === 'learn') {
    $('learnPart').value = String(DRUM_CHANNEL);
    setLearn(true);
    drumRun.judge = null;
  } else {
    // The beat is yours: the drums are left out (the click keeps playing) and every hit is timed.
    player.silent = { isTarget: (e) => e.ch === DRUM_CHANNEL };
    drumRun.judge = new DrumJudge(g.hits, sameDrum);
  }
  player.seek(0);
  player.play();
}

function lessonGrooveDone() {
  const step = lessonRun.step;
  player.silent = null;
  if (step.mode === 'learn') {
    const acc = Math.round((100 * learn.correct) / Math.max(1, learn.correct + learn.wrong));
    if (learn.enabled) setLearn(false);
    completeLessonStep(starsForAccuracy(acc));
    lessonFeedback(`Beat learned: ${acc}% of your hits right. ${'★'.repeat(starsForAccuracy(acc))} Next: play it in time.`, 'good');
    return;
  }
  const j = drumRun.judge;
  drumRun.judge = null;
  if (!j) return;
  const acc = j.accuracy;
  const off = j.averageOffsetMs;
  const feel = Math.abs(off) < 40 ? 'Right on the click!' : off < 0 ? `You're a little early (rushing) by ${-off} ms: relax and lean back.` : `You're a little late (dragging) by ${off} ms: listen for the click.`;
  if (acc < 50) {
    // Not passed yet: try again (the step stays open).
    lessonFeedback(`${acc}% in time. ${feel} Press "Start this step again" to try once more; the Learn step before this one helps too.`, 'bad');
    return;
  }
  completeLessonStep(starsForAccuracy(acc));
  lessonFeedback(`${acc}% in time, ${j.perfects} perfect. ${feel} ${'★'.repeat(starsForAccuracy(acc))}`, 'good');
}

// ---- Singing steps (Voice course) ------------------------------------------

const singRun = { judge: null, range: null, off: null, muteUntil: 0 };

function playReference(note) {
  synth.ensure();
  synth.noteOn(LIVE_CHANNEL, note, 80, synth.now + 0.02);
  synth.noteOff(LIVE_CHANNEL, note, synth.now + 0.9);
  // Don't let the speakers "sing" the note for you.
  singRun.muteUntil = performance.now() + 1300;
}

function showSingMeter(exact, target) {
  const needle = $('lpNeedle');
  if (exact === null) {
    needle.classList.add('off');
    setText($('lpHeard'), '–');
    return;
  }
  const { midi, cents } = freqToCents(midiToFreq(exact));
  // With a target: how far from it (any octave). Without: from the nearest note.
  let off = cents;
  if (target !== undefined) {
    off = ((((exact - target) * 100 + 600) % 1200) + 1200) % 1200 - 600;
    off = Math.max(-100, Math.min(100, off));
  }
  needle.classList.remove('off');
  needle.style.left = `${50 + (target !== undefined ? off / 2 : off)}%`;
  setText($('lpHeard'), `${noteLetter(midi)}${Math.floor(midi / 12) - 1}`);
}

function startSinging(step) {
  stopSinging();
  if (!micSupported()) {
    if (step.type !== 'song') {
      lessonRun.done = true;
      lessonRun.stars[lessonRun.stepIdx] = 0;
      $('lpNext').disabled = false;
      lessonFeedback(IN_HOST ? 'Singing needs the microphone: open the Knight Lyfe Ultimate app (the Logic plug-in can\'t hear a mic) or the website. Skip it for now with Next.' : 'This browser can\'t use a microphone. Skip this step with Next.', 'bad');
    }
    return;
  }
  toggleMic(true);
  if (step.type === 'sing') {
    singRun.judge = new SingJudge(step.notes, { hold: step.hold || 0.6, tolerance: step.tolerance || 40 });
    $('lpHold').style.width = '0%';
    if (step.hear) setTimeout(() => lessonRun.step === step && playReference(step.notes[0]), 400);
  }
  if (step.type === 'range') {
    singRun.range = new RangeFinder();
    lessonFeedback('Sing low to high and back. Your range shows here.');
  }
  singRun.off = onPitch((exact, dt) => {
    if (performance.now() < singRun.muteUntil) exact = null;
    if (step.type === 'sing') singFrame(step, exact, dt);
    else if (step.type === 'range') rangeFrame(exact);
  });
}

function stopSinging() {
  singRun.off?.();
  Object.assign(singRun, { judge: null, range: null, off: null });
}

function singFrame(step, exact, dt) {
  const judge = singRun.judge;
  if (!judge || lessonRun.done) return;
  showSingMeter(exact, judge.target);
  const r = judge.push(exact, dt);
  $('lpHold').style.width = `${Math.round(judge.progress * 100)}%`;
  if (r === 'hit') {
    lessonRun.pos = judge.pos;
    setLessonTargets();
    renderLessonTargets();
    lessonFeedback(step.tune ? '✓ In tune! Next string.' : '✓ In tune!', 'good');
    if (step.hear) setTimeout(() => lessonRun.step === step && !lessonRun.done && playReference(judge.target), 350);
  } else if (r === 'done') {
    lessonRun.pos = judge.pos;
    $('lpHold').style.width = '100%';
    completeLessonStep(starsForSinging(judge.averageCents, judge.misses));
  } else if (r === 'miss') {
    const sharp = (judge.lastCents ?? 0) > 0;
    lessonFeedback(step.tune ? `${sharp ? 'Too high: loosen the string (tune down) ⬇' : 'Too low: tighten the string (tune up) ⬆'}, a little at a time.` : `Not quite: you're ${sharp ? 'above' : 'below'} ${noteLetter(judge.target)}. Slide ${sharp ? 'down' : 'up'} until the needle is in the middle.`, 'bad');
    if (step.hear) playReference(judge.target);
  } else if (exact !== null && judge.lastCents !== null && Math.abs(judge.lastCents) > judge.tolerance) {
    lessonFeedback(step.tune ? (judge.lastCents > 0 ? 'A little high: loosen ⬇' : 'A little low: tighten ⬆') : judge.lastCents > 0 ? 'A little high: come down ⬇' : 'A little low: go up ⬆');
  }
}

function rangeFrame(exact) {
  const rf = singRun.range;
  if (!rf) return;
  showSingMeter(exact);
  rf.push(exact === null ? null : Math.round(exact));
  if (rf.low === null) return;
  const type = voiceType(rf.low, rf.high);
  const name = (n) => `${noteLetter(n)}${Math.floor(n / 12) - 1}`;
  if (rf.span >= 5) {
    stage.voice ??= {};
    stage.voice[stage.current] = { low: rf.low, high: rf.high, type: type.id };
    saveStage(stage);
    if (!lessonRun.done) {
      lessonRun.stars[lessonRun.stepIdx] = 3;
      lessonRun.done = true;
      $('lpNext').disabled = false;
    }
    lessonFeedback(`Your range: ${name(rf.low)} to ${name(rf.high)}, about ${Math.round(rf.span / 12 * 10) / 10} octaves. That fits ${type.name}. Keep going to stretch it, or press Next.`, 'good');
  } else lessonFeedback(`So far: ${name(rf.low)} to ${name(rf.high)}. Keep sliding up and down.`);
}

function initLessons() {
  const dlg = $('lessonDlg');
  $('btnLessons').onclick = () => {
    if (!dlg.open) dlg.show();
    if (!lessonRun.active) renderLessonMap();
  };
  dlg.querySelector('[data-close]').onclick = () => {
    leaveLesson();
    dlg.close();
  };
  makeDraggable(dlg);
  $('lpMic').hidden = !micSupported();
  $('lpMic').onclick = () => toggleMic();
  $('lpHear').onclick = () => {
    const t = singRun.judge?.target;
    if (t !== undefined) playReference(t);
  };
  $('lpPlayer').onchange = () => {
    stage.current = $('lpPlayer').value;
    saveStage(stage);
    if (!lessonRun.active) renderLessonMap();
    else renderLessonHeader();
  };
  $('lpBack').onclick = () => {
    leaveLesson();
    renderLessonMap();
  };
  $('lpRestart').onclick = () => showLessonStep(lessonRun.stepIdx);
  $('lpNext').onclick = () => {
    if (!lessonRun.done) return;
    if (lessonRun.stepIdx + 1 < lessonRun.lesson.steps.length) showLessonStep(lessonRun.stepIdx + 1);
    else finishLesson();
  };
  $('lpDoneMap').onclick = () => renderLessonMap();
}

// ---- Teachers, video and quiz steps (course template) ----------------------------

let courseVideos = loadVideos();
const courseOfLesson = (lesson) => UNITS.find((u) => u.lessons.some((l) => l.id === lesson.id))?.course || 'piano';
function teacherForCourse(courseId) {
  const c = COURSES.find((x) => x.id === courseId);
  const t = c?.teacher ?? COURSE_TEACHERS[courseId];
  return typeof t === 'object' && t ? { ...TEACHERS[0], ...t } : teacherById(t);
}
function teacherAvatar(t, size = 44) {
  const a = Object.assign(document.createElement('span'), { className: 't-avatar', textContent: t.avatar ? '' : t.emoji || t.name[0] });
  a.style.background = t.color || '#4f8cff';
  a.style.width = a.style.height = `${size}px`;
  a.style.fontSize = `${Math.round(size / 2)}px`;
  if (t.avatar) Object.assign(a.style, { backgroundImage: `url("${t.avatar}")`, backgroundSize: 'cover' });
  a.title = t.name;
  return a;
}

function renderTeacherCard() {
  const box = $('lpTeacher');
  const t = lessonRun.teacher;
  box.hidden = !t;
  $('lpLesson').classList.toggle('has-teacher', !!t);
  if (!t) return;
  box.innerHTML = '';
  const name = Object.assign(document.createElement('span'), { className: 't-name', textContent: t.name });
  name.append(Object.assign(document.createElement('span'), { className: 't-role', textContent: t.role }));
  box.append(teacherAvatar(t), name);
}

let videoUrl = null;
async function renderVideoStep(step) {
  const box = $('lpVideo');
  box.innerHTML = '';
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = null;
  box.hidden = step.type !== 'video';
  if (step.type !== 'video') return;
  const done = () => {
    if (lessonRun.step !== step || lessonRun.done) return;
    lessonRun.done = true;
    lessonRun.stars[lessonRun.stepIdx] = 0; // watching doesn't change the stars
    $('lpNext').disabled = false;
    lessonFeedback('✓ Watched. Press Next when you\'re ready.', 'good');
  };
  let src = step.src;
  if (src?.startsWith('idb:')) {
    const blob = await loadVideoFile(src.slice(4));
    src = blob ? (videoUrl = URL.createObjectURL(blob)) : null;
  }
  const v = videoSource(src);
  if (!v) {
    // No video made yet: the teacher's script reads along instead, so the course works today.
    const pre = Object.assign(document.createElement('div'), { className: 'lp-script', textContent: step.script || step.text || '' });
    box.append(pre);
    done();
    return;
  }
  if (v.kind === 'file') {
    const el = Object.assign(document.createElement('video'), { src: v.embed, controls: true, playsInline: true });
    el.addEventListener('ended', done);
    el.addEventListener('timeupdate', () => el.duration && el.currentTime / el.duration >= 0.9 && done());
    el.addEventListener('error', () => {
      lessonFeedback('This video couldn\'t play here. Check the link in the Course Studio.', 'bad');
      done();
    });
    box.append(el);
  } else {
    const frame = Object.assign(document.createElement('iframe'), { src: v.embed, allow: 'autoplay; fullscreen; picture-in-picture', allowFullscreen: true });
    const watched = Object.assign(document.createElement('button'), { textContent: '✓ I watched it', className: 'mini' });
    watched.onclick = done;
    box.append(frame, watched);
  }
  lessonFeedback('Watch the video, then press Next.');
}

function renderQuizStep(step) {
  const box = $('lpQuiz');
  box.innerHTML = '';
  box.hidden = step.type !== 'quiz';
  if (step.type !== 'quiz') return;
  lessonFeedback('Pick an answer.');
  step.choices.forEach((c, k) => {
    const b = Object.assign(document.createElement('button'), { textContent: c });
    b.onclick = () => {
      if (lessonRun.done) return;
      lessonRun.quizTries++;
      if (k === step.answer) {
        b.classList.add('right');
        completeLessonStep(lessonRun.quizTries === 1 ? 3 : lessonRun.quizTries === 2 ? 2 : 1);
        lessonFeedback(`✓ Right! ${step.explain || ''}`, 'good');
      } else {
        b.classList.add('wrong');
        lessonFeedback(`Not quite. ${step.hint || 'Try again.'}`, 'bad');
      }
    };
    box.append(b);
  });
}

// ---- Course Studio ---------------------------------------------------------------
//
// Make courses for any subject with the same engine: units, lessons and steps
// (talks, videos, quizzes, music exercises), an AI teacher, and a video script
// for every lesson. Courses save as portable packs (.kcourse).

const studio = { list: loadCourses(), pack: null, unit: 0, lesson: 0 };
// Courses that come with the app (on the same template), then your own.
for (const p of BUNDLED_PACKS) {
  addCourse(p);
  COURSES.find((c) => c.id === p.id).bundled = true;
}
for (const p of studio.list) addCourse(p);
const songTitle = (id) => SONGS.find((x) => x.id === id)?.title || '';

function studioLesson() {
  return studio.pack?.units[studio.unit]?.lessons[studio.lesson] || null;
}
function videoKey(lesson) {
  return studio.pack.builtin ? lesson.id : `${studio.pack.id}/${lesson.id}`;
}

function renderStudioLists() {
  const mine = $('csCourses');
  mine.innerHTML = '';
  if (!studio.list.length) mine.append(Object.assign(document.createElement('p'), { className: 'small', textContent: 'None yet. Make one, or copy a Knight Lyfe course below.' }));
  for (const p of studio.list) {
    const b = Object.assign(document.createElement('button'), { textContent: `${p.icon || '📘'} ${p.title}`, className: studio.pack?.id === p.id ? 'on' : '' });
    b.onclick = () => openStudioPack(JSON.parse(JSON.stringify(p)));
    mine.append(b);
  }
  const tpl = $('csTemplates');
  tpl.innerHTML = '';
  for (const c of COURSES.filter((x) => !x.custom || x.bundled)) {
    const b = Object.assign(document.createElement('button'), { textContent: `${c.icon} ${c.name}`, title: 'Copy this course to change it, or attach teacher videos to its lessons' });
    b.onclick = () => {
      const bundled = BUNDLED_PACKS.find((x) => x.id === c.id);
      const pack = bundled ? { ...JSON.parse(JSON.stringify(bundled)), units: bundled.units.map((u) => ({ ...u, lessons: u.lessons.map((l) => ({ ...l, id: `${c.id}/${l.id}` })) })) } : courseToPack(c, unitsFor(c.id));
      pack.builtin = true; // videos attach to the built-in lessons; "Save" makes your own copy
      openStudioPack(pack);
    };
    tpl.append(b);
  }
  const tb = $('csTeachers');
  tb.innerHTML = '';
  for (const t of TEACHERS) {
    const row = Object.assign(document.createElement('div'), { className: 'cs-teacher', title: 'Show the character brief for AI video tools' });
    row.append(teacherAvatar(t, 30), Object.assign(document.createElement('span'), { textContent: `${t.name} · ${t.role}` }));
    row.onclick = () => showScript(`${t.name}: character brief`, characterBrief(t));
    tb.append(row);
  }
}

function openStudioPack(pack) {
  studio.pack = pack;
  studio.unit = 0;
  studio.lesson = 0;
  $('csMain').hidden = false;
  $('csTitle').value = pack.title;
  $('csIcon').value = pack.icon || '';
  $('csSubject').value = pack.subject || '';
  $('csBy').value = pack.by || '';
  $('csDesc').value = pack.description || '';
  $('csTeacher').value = typeof pack.teacher === 'string' ? pack.teacher : TEACHERS[0].id;
  $('csDelete').hidden = !!pack.builtin || !studio.list.some((p) => p.id === pack.id);
  renderStudio();
  renderStudioLists();
}

function readStudioFields() {
  const p = studio.pack;
  Object.assign(p, { title: $('csTitle').value.trim() || 'Untitled course', icon: $('csIcon').value.trim() || '📘', subject: $('csSubject').value.trim(), by: $('csBy').value.trim(), description: $('csDesc').value.trim(), teacher: $('csTeacher').value });
  const l = studioLesson();
  if (l) l.title = $('csLessonName').value.trim() || l.title;
}

function renderStudio() {
  const p = studio.pack;
  const t = teacherById($('csTeacher').value);
  setText($('csTeacherRole'), `${t.emoji} ${t.role}: ${t.voice}`);
  const tree = $('csTree');
  tree.innerHTML = '';
  p.units.forEach((u, ui) => {
    const row = Object.assign(document.createElement('div'), { className: 'unit' });
    const name = Object.assign(document.createElement('input'), { value: u.title, title: 'Unit name' });
    name.oninput = () => (u.title = name.value);
    const del = Object.assign(document.createElement('button'), { className: 'mini', textContent: '🗑', title: 'Delete this unit' });
    del.onclick = () => {
      if (p.units.length < 2) return toast('A course needs at least one unit.');
      if (!confirm(`Delete the unit "${u.title}" and its lessons?`)) return;
      p.units.splice(ui, 1);
      studio.unit = 0;
      studio.lesson = 0;
      renderStudio();
    };
    row.append(Object.assign(document.createElement('span'), { textContent: u.icon || '⭐' }), name, del);
    tree.append(row);
    u.lessons.forEach((l, li) => {
      const b = Object.assign(document.createElement('button'), { className: `lesson mini${ui === studio.unit && li === studio.lesson ? ' on' : ''}`, textContent: `${courseVideos[studio.pack.builtin ? l.id : `${p.id}/${l.id}`] ? '🎬 ' : ''}${l.title}` });
      b.onclick = () => {
        readStudioFields();
        studio.unit = ui;
        studio.lesson = li;
        renderStudio();
      };
      tree.append(b);
    });
  });
  const l = studioLesson();
  $('csLessonName').value = l?.title || '';
  renderStudioSteps();
  const v = l && courseVideos[videoKey(l)];
  $('csVideoUrl').value = v && !v.src.startsWith('idb:') ? v.src : '';
  setText($('csVideoNote'), v ? (v.src.startsWith('idb:') ? `🎬 File: ${v.name}` : '🎬 Video attached') : 'No video yet: students see the script until you add one.');
  $('csJson').value = l ? JSON.stringify(l.steps, null, 1) : '';
  const errors = validateCourse(p, { songIds: new Set(SONGS.map((x) => x.id)) });
  const st = $('csStatus');
  st.className = `small cs-status ${errors.length ? 'err' : 'ok'}`;
  st.textContent = errors.length ? `⚠ ${errors.slice(0, 3).join(' · ')}` : `✓ ${p.units.reduce((a, u) => a + u.lessons.length, 0)} lessons, ready to save.`;
}

function stepEditor(step, i, steps) {
  const box = Object.assign(document.createElement('div'), { className: 'cs-step' });
  const head = Object.assign(document.createElement('div'), { className: 'head' });
  head.append(Object.assign(document.createElement('span'), { textContent: `${i + 1}. ${STEP_LABELS[step.type] || step.type}` }));
  const move = (d) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    renderStudio();
  };
  for (const [label, fn, title] of [['↑', () => move(-1), 'Move up'], ['↓', () => move(1), 'Move down'], ['✕', () => (steps.splice(i, 1), renderStudio()), 'Delete step']]) {
    const b = Object.assign(document.createElement('button'), { className: 'mini', textContent: label, title });
    b.onclick = fn;
    head.append(b);
  }
  box.append(head);
  const field = (tag, key, attrs = {}, parse = (v) => v, show = (v) => v ?? '') => {
    const el = Object.assign(document.createElement(tag), attrs);
    el.value = show(step[key]);
    el.oninput = () => {
      step[key] = parse(el.value);
      const errors = validateCourse(studio.pack, { songIds: new Set(SONGS.map((x) => x.id)) });
      $('csStatus').className = `small cs-status ${errors.length ? 'err' : 'ok'}`;
      $('csStatus').textContent = errors.length ? `⚠ ${errors.slice(0, 3).join(' · ')}` : '✓ Ready to save.';
    };
    box.append(el);
    return el;
  };
  const text = (ph) => field('textarea', 'text', { rows: 2, placeholder: ph });
  switch (step.type) {
    case 'info':
      text('What the teacher says or explains');
      break;
    case 'video':
      field('input', 'src', { placeholder: 'Video link (YouTube, Vimeo, .mp4), or leave empty and add it later' });
      text('Shown under the video');
      field('textarea', 'script', { rows: 3, placeholder: 'Script for the AI teacher video (shown as read-along until the video exists)' });
      break;
    case 'quiz': {
      field('input', 'question', { placeholder: 'Question' });
      field('textarea', 'choices', { rows: 3, placeholder: 'One answer per line' }, (v) => v.split('\n').map((x) => x.trim()).filter(Boolean), (v) => (v || []).join('\n'));
      const ans = Object.assign(document.createElement('select'), { title: 'The right answer' });
      (step.choices || []).forEach((c, k) => ans.append(new Option(`✓ ${c}`, String(k))));
      ans.value = String(step.answer ?? 0);
      ans.onchange = () => (step.answer = Number(ans.value));
      box.append(ans);
      field('input', 'explain', { placeholder: 'Why it\'s right (shown after answering)' });
      break;
    }
    case 'notes':
      text('Instructions');
      field('input', 'notes', { placeholder: 'Notes, e.g. C4 D4 E4' }, (v) => v.split(/[\s,]+/).filter(Boolean).map((x) => { try { return parsePitch(x); } catch { return NaN; } }).filter((n) => Number.isFinite(n)), (v) => (v || []).map((n) => noteLabel(n).replace('♯', '#').replace('♭', 'b')).join(' '));
      break;
    case 'song': {
      const sel = document.createElement('select');
      for (const x of SONGS) sel.append(new Option(x.title, x.id));
      sel.value = step.song || SONGS[0].id;
      step.song = sel.value;
      sel.onchange = () => (step.song = sel.value);
      const part = document.createElement('select');
      for (const [v, l] of [['0', 'Right hand / melody'], ['1', 'Left hand / chords'], ['0,1', 'Both hands'], ['9', 'Drums']]) part.append(new Option(l, v));
      part.value = step.part || '0';
      step.part = part.value;
      part.onchange = () => (step.part = part.value);
      box.append(sel, part);
      text('Instructions');
      break;
    }
    default:
      box.append(Object.assign(document.createElement('div'), { className: 'small', textContent: step.text || '(a music exercise: edit it as JSON below)' }));
  }
  return box;
}

function renderStudioSteps() {
  const box = $('csSteps');
  box.innerHTML = '';
  const l = studioLesson();
  if (!l) return;
  l.steps.forEach((st, i) => box.append(stepEditor(st, i, l.steps)));
}

function showScript(title, text) {
  setText($('csScriptTitle'), title);
  setText($('csScriptText'), text);
  $('csScriptBox').hidden = false;
}

function saveStudioPack() {
  readStudioFields();
  const p = studio.pack;
  if (p.builtin) {
    // A copy of a Knight Lyfe course becomes your own course.
    delete p.builtin;
    p.id = `${p.id}-mine-${Date.now().toString(36)}`;
    p.title = `${p.title} (my version)`;
    $('csTitle').value = p.title;
  }
  const errors = validateCourse(p, { songIds: new Set(SONGS.map((x) => x.id)) });
  if (errors.length) return toast(`Fix this first: ${errors[0]}`);
  const i = studio.list.findIndex((x) => x.id === p.id);
  const copy = JSON.parse(JSON.stringify(p));
  if (i >= 0) studio.list[i] = copy;
  else studio.list.push(copy);
  saveCourses(studio.list);
  addCourse(copy);
  $('csDelete').hidden = false;
  renderStudioLists();
  renderStudio();
  toast(`Saved: "${p.title}" is in Lessons under its own tab.`);
}

function initStudio() {
  const dlg = $('studioDlg');
  $('lpStudio').onclick = () => {
    if (!dlg.open) dlg.show();
    renderStudioLists();
  };
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  makeDraggable(dlg);
  for (const t of TEACHERS) $('csTeacher').append(new Option(`${t.emoji} ${t.name} (${t.role})`, t.id));
  for (const type of STEP_TYPES) $('csStepType').append(new Option(STEP_LABELS[type], type));
  $('csStepType').value = 'info';
  $('csNew').onclick = () => openStudioPack(newCourse('New course', $('csTeacher').value || TEACHERS[0].id));
  for (const id of ['csTitle', 'csIcon', 'csSubject', 'csBy', 'csDesc']) $(id).oninput = () => readStudioFields();
  $('csTeacher').onchange = () => {
    readStudioFields();
    renderStudio();
  };
  $('csLessonName').oninput = () => readStudioFields();
  $('csAddUnit').onclick = () => {
    readStudioFields();
    const n = studio.pack.units.length + 1;
    studio.pack.units.push({ id: `unit-${Date.now().toString(36)}`, title: `Unit ${n}`, icon: '⭐', lessons: [{ id: `lesson-${Date.now().toString(36)}`, title: 'New lesson', steps: [{ type: 'info', text: 'Introduce the lesson here.' }] }] });
    studio.unit = studio.pack.units.length - 1;
    studio.lesson = 0;
    renderStudio();
  };
  $('csAddLesson').onclick = () => {
    readStudioFields();
    const u = studio.pack.units[studio.unit];
    u.lessons.push({ id: `lesson-${Date.now().toString(36)}`, title: 'New lesson', steps: [{ type: 'info', text: 'Introduce the lesson here.' }] });
    studio.lesson = u.lessons.length - 1;
    renderStudio();
  };
  $('csDelLesson').onclick = () => {
    const u = studio.pack.units[studio.unit];
    if (u.lessons.length < 2) return toast('A unit needs at least one lesson.');
    if (!confirm(`Delete the lesson "${studioLesson().title}"?`)) return;
    u.lessons.splice(studio.lesson, 1);
    studio.lesson = 0;
    renderStudio();
  };
  $('csAddStep').onclick = () => {
    const l = studioLesson();
    const type = $('csStepType').value;
    const blank = { info: { text: '' }, video: { src: '', text: '', script: '' }, quiz: { question: '', choices: ['', ''], answer: 0, explain: '' }, notes: { text: 'Play these notes.', notes: [60, 62, 64] }, song: { song: SONGS[0].id, part: '0', text: 'Play along.' } }[type] || { text: 'Edit this step as JSON below.' };
    l.steps.push({ type, ...blank });
    renderStudio();
  };
  $('csJsonApply').onclick = () => {
    try {
      const steps = JSON.parse($('csJson').value);
      if (!Array.isArray(steps)) throw new Error('expected a list of steps');
      studioLesson().steps = steps;
      renderStudio();
    } catch (err) {
      toast(`That JSON has a problem: ${err.message}`);
    }
  };
  // Videos for a lesson: a link, or a file kept in this browser.
  $('csVideoUrl').onchange = () => {
    const l = studioLesson();
    const v = $('csVideoUrl').value.trim();
    if (v) courseVideos[videoKey(l)] = { src: v };
    else delete courseVideos[videoKey(l)];
    saveVideos(courseVideos);
    renderStudio();
  };
  $('csVideoFile').onclick = () => $('csVideoPick').click();
  $('csVideoPick').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const key = videoKey(studioLesson());
    try {
      await saveVideoFile(key, file);
      courseVideos[key] = { src: `idb:${key}`, name: file.name };
      saveVideos(courseVideos);
      renderStudio();
      toast(`Video added: ${file.name}. It stays in this browser; for other devices, upload it (YouTube unlisted, Vimeo...) and paste the link.`, [], 6000);
    } catch (err) {
      toast(`Couldn't keep that video here (${err.message}). Paste a link instead.`);
    }
  };
  $('csScript').onclick = () => {
    readStudioFields();
    const p = studio.pack;
    const n = p.units.slice(0, studio.unit).reduce((a, u) => a + u.lessons.length, 0) + studio.lesson + 1;
    const s = lessonScript(studioLesson(), { teacher: p.teacher, course: p.title, unit: p.units[studio.unit].title, number: n, songTitle });
    showScript(`Video script · about ${Math.max(1, Math.round(s.seconds / 60))} min`, `${s.text}\n\n----\nCHARACTER BRIEF (paste into your AI video tool)\n${characterBrief(teacherById(p.teacher))}`);
  };
  $('csScriptCopy').onclick = () => navigator.clipboard?.writeText($('csScriptText').textContent).then(() => toast('Copied.'), () => toast('Select the text and copy it.'));
  $('csScriptClose').onclick = () => ($('csScriptBox').hidden = true);
  $('csSave').onclick = saveStudioPack;
  $('csTry').onclick = () => {
    readStudioFields();
    if (studio.pack.builtin) {
      const lesson = unitsFor(studio.pack.id)[studio.unit]?.lessons[studio.lesson];
      if (lesson) startLessonFromStudio(lesson);
      return;
    }
    saveStudioPack();
    const lesson = UNITS.find((u) => u.id === `${studio.pack.id}/${studio.pack.units[studio.unit].id}`)?.lessons[studio.lesson];
    if (lesson) startLessonFromStudio(lesson);
  };
  const fileName = () => (studio.pack.title || 'course').replace(/[\\/:*?"<>|]/g, '-');
  $('csExport').onclick = () => {
    readStudioFields();
    const p = { ...studio.pack };
    delete p.builtin;
    download(JSON.stringify(p, null, 1), `${fileName()}.kcourse`, 'application/json');
  };
  $('csScripts').onclick = () => {
    readStudioFields();
    const p = studio.pack;
    let n = 0;
    const all = p.units.flatMap((u) => u.lessons.map((l) => lessonScript(l, { teacher: p.teacher, course: p.title, unit: u.title, number: ++n, songTitle }).text));
    download(`${p.title}: video scripts\n\nCHARACTER BRIEF\n${characterBrief(teacherById(p.teacher))}\n\n${'='.repeat(60)}\n\n${all.join(`\n\n${'='.repeat(60)}\n\n`)}`, `${fileName()} - video scripts.txt`, 'text/plain');
  };
  $('csCsv').onclick = () => {
    readStudioFields();
    download(scriptsCsv(studio.pack, songTitle), `${fileName()} - scripts.csv`, 'text/csv');
  };
  $('csDelete').onclick = () => {
    const p = studio.pack;
    if (!confirm(`Delete the course "${p.title}"? Its lessons leave the Lessons window.`)) return;
    studio.list = studio.list.filter((x) => x.id !== p.id);
    saveCourses(studio.list);
    removeCourse(p.id);
    studio.pack = null;
    $('csMain').hidden = true;
    renderStudioLists();
  };
  $('csImport').onclick = () => $('csFile').click();
  $('csFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const pack = JSON.parse(await file.text());
      const errors = validateCourse(pack, { songIds: new Set(SONGS.map((x) => x.id)) });
      if (errors.length) return toast(`Can't use this course: ${errors[0]}`);
      openStudioPack(pack);
      saveStudioPack();
    } catch (err) {
      toast(`Couldn't read ${file.name}: ${err.message}`);
    }
  };
}

function startLessonFromStudio(lesson) {
  $('studioDlg').close(); // out of the way; 🛠 Course Studio brings it back
  const dlg = $('lessonDlg');
  if (!dlg.open) dlg.show();
  lessonCourse = courseOfLesson(lesson);
  startLesson(lesson);
}

// ---- Ask the teacher -------------------------------------------------------------------
//
// The Knight Lyfe characters answer questions live, with what you're doing in
// the lesson as context. Their brain is Ollama on kl-oracle (free and private);
// answers stream in, can be spoken aloud, and the face's mouth moves as they talk.

const AI_KEY = 'kk.ai';
const ask = { cfg: { server: '', model: '', voice: true }, history: loadAskHistory(), busy: null, teacher: null, speaking: false };
try {
  Object.assign(ask.cfg, JSON.parse(localStorage.getItem(AI_KEY) || '{}'));
} catch {
  /* defaults */
}
const saveAskCfg = () => {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(ask.cfg));
  } catch {
    /* storage unavailable */
  }
};
const askServer = () => normalizeServer(ask.cfg.server);
const askLogKey = () => `${stage.current}:${ask.teacher.id}`;

/** Where the student is right now, for the teacher to know. */
function askContext() {
  const ctx = { student: stagePlayer()?.name };
  if (lessonRun.active && lessonRun.lesson) {
    const courseId = courseOfLesson(lessonRun.lesson);
    const unit = UNITS.find((u) => u.lessons.some((l) => l.id === (lessonRun.lesson.base || lessonRun.lesson).id));
    ctx.course = COURSES.find((c) => c.id === courseId)?.name;
    ctx.unit = unit?.title;
    ctx.lesson = lessonRun.lesson.title;
    const st = lessonRun.step;
    if (st) {
      const what = st.type === 'quiz' ? `quiz question "${st.question}" (choices: ${st.choices.join(', ')})` : `${STEP_LABELS[st.type] || st.type}: ${st.text || ''}`;
      ctx.step = `step ${lessonRun.stepIdx + 1} of ${lessonRun.lesson.steps.length}, ${what}`;
      const bits = [];
      if (lessonRun.mistakes) bits.push(`${lessonRun.mistakes} wrong note${lessonRun.mistakes > 1 ? 's' : ''} so far on this step`);
      if (lessonRun.done) bits.push('this step is finished');
      const stars = lessonRun.stars.filter((x) => x > 0);
      if (stars.length) bits.push(`earlier steps: ${stars.map((x) => `${x} star${x > 1 ? 's' : ''}`).join(', ')}`);
      if (learn.enabled) bits.push(`learn mode: ${learn.correct} right, ${learn.wrong} wrong`);
      ctx.progress = bits.join('; ');
    }
    ctx.feedback = $('lpFeedback').textContent.trim();
  }
  if (state.song) ctx.song = state.song.title || state.midiName;
  return ctx;
}

function setMouth(v) {
  $('askFace').style.setProperty('--mouth', String(v));
  puppet.askMouth = v; // the Puppet Studio can speak the answer too
}

function renderAskHeader() {
  const t = ask.teacher;
  $('askFace').innerHTML = teacherFaceSvg(t);
  setText($('askName'), `${t.name} · ${t.role}`);
  const c = askContext();
  setText($('askContext'), c.lesson ? `Knows you're on: ${c.lesson}` : 'Ask about music, your lessons, or practice.');
  $('askTeacher').value = t.id;
  $('askVoice').textContent = ask.cfg.voice ? '🔊 Voice on' : '🔇 Voice off';
}

function addAskMsg(role, text) {
  const el = Object.assign(document.createElement('div'), { className: `ask-msg ${role}`, textContent: text });
  $('askLog').append(el);
  $('askLog').scrollTop = $('askLog').scrollHeight;
  return el;
}

function renderAskLog() {
  $('askLog').innerHTML = '';
  const log = ask.history[askLogKey()] || [];
  for (const m of log.slice(-12)) addAskMsg(m.role, m.content);
  if (!log.length) addAskMsg('assistant', `${ask.teacher.style.hello} Ask me anything about what you're learning!`);
}

function speak(text) {
  if (!ask.cfg.voice || typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  // Each character gets a steady voice: a different pick from the list per teacher.
  if (voices.length) u.voice = voices[TEACHERS.findIndex((t) => t.id === ask.teacher.id) % voices.length];
  u.rate = 1;
  u.onboundary = () => {
    setMouth(1);
    setTimeout(() => setMouth(0.3), 110);
  };
  u.onend = () => {
    ask.speaking = false;
    setMouth(0);
  };
  ask.speaking = true;
  speechSynthesis.speak(u);
}

async function sendAsk(question) {
  question = question.trim();
  if (!question || ask.busy) return;
  const server = askServer();
  addAskMsg('user', question);
  $('askText').value = '';
  if (!server) {
    addAskMsg('error', 'The teachers\' AI server isn\'t set up yet. Press ⚙ and enter kl-oracle\'s address (see the AI Studio setup).');
    $('askSettings').hidden = false;
    return;
  }
  const key = askLogKey();
  const log = (ask.history[key] ??= []);
  const messages = buildMessages(ask.teacher, askContext(), log, question);
  log.push({ role: 'user', content: question, at: Date.now() });
  const out = addAskMsg('assistant', '…');
  const ctrl = new AbortController();
  ask.busy = ctrl;
  $('askSend').hidden = true;
  $('askStop').hidden = false;
  let flap = 0;
  try {
    const answer = await askTeacher(server, ask.cfg.model || 'llama3.2:3b', messages, {
      signal: ctrl.signal,
      onText: (t) => {
        out.textContent = t;
        $('askLog').scrollTop = $('askLog').scrollHeight;
        if (!ask.cfg.voice) setMouth((flap = 1 - flap)); // lips move with the words when there's no voice
      },
    });
    out.textContent = answer || '(no answer)';
    log.push({ role: 'assistant', content: answer, at: Date.now() });
    saveAskHistory(ask.history);
    speak(answer);
  } catch (err) {
    out.remove();
    if (err.name === 'AbortError') addAskMsg('error', 'Stopped.');
    else if (err instanceof TypeError) addAskMsg('error', `Couldn't reach the AI server at ${server}. Is kl-oracle on? If it's the first time on this Mac, open ${server.replace(/\/ollama$/, '')} in a tab once and trust its certificate.`);
    else addAskMsg('error', `The AI server had a problem: ${err.message}`);
  } finally {
    ask.busy = null;
    $('askSend').hidden = false;
    $('askStop').hidden = true;
    if (!ask.speaking) setMouth(0);
  }
}

async function testAskServer() {
  const server = askServer();
  if (!server) return setText($('askStatus'), 'Enter kl-oracle\'s address first.');
  setText($('askStatus'), `Connecting to ${server}…`);
  try {
    const models = await listModels(server);
    const sel = $('askModel');
    sel.innerHTML = '';
    for (const m of models) sel.append(new Option(m, m));
    if (!models.length) return setText($('askStatus'), 'Connected, but no models yet: run the AI Studio setup (it downloads them).');
    ask.cfg.model = models.includes(ask.cfg.model) ? ask.cfg.model : models.find((m) => /llama3\.2/.test(m)) || models[0];
    sel.value = ask.cfg.model;
    saveAskCfg();
    setText($('askStatus'), `✓ Connected: ${models.length} model${models.length > 1 ? 's' : ''}. Using ${ask.cfg.model}.`);
  } catch (err) {
    setText($('askStatus'), err instanceof TypeError ? `✗ Couldn't reach it. Is kl-oracle on, and did you trust its certificate (open ${server.replace(/\/ollama$/, '')} once)?` : `✗ ${err.message}`);
  }
}

function openAsk(teacherId) {
  const dlg = $('askDlg');
  ask.teacher = teacherById(teacherId || lessonRun.teacher?.id || teacherForCourse(lessonCourse).id);
  if (!dlg.open) dlg.show();
  renderAskHeader();
  renderAskLog();
  $('askText').focus();
}

function initAsk() {
  const dlg = $('askDlg');
  dlg.querySelector('[data-close]').onclick = () => {
    ask.busy?.abort();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    dlg.close();
  };
  makeDraggable(dlg);
  for (const t of TEACHERS) $('askTeacher').append(new Option(`${t.emoji} ${t.name}`, t.id));
  $('askTeacher').onchange = () => openAsk($('askTeacher').value);
  $('lpAsk').onclick = () => openAsk(lessonRun.teacher?.id);
  for (const q of QUICK_ASKS) {
    const b = Object.assign(document.createElement('button'), { className: 'mini', textContent: q.label });
    b.onclick = () => sendAsk(q.text);
    $('askQuick').append(b);
  }
  $('askSend').onclick = () => sendAsk($('askText').value);
  $('askText').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAsk($('askText').value);
  });
  $('askStop').onclick = () => ask.busy?.abort();
  $('askVoice').onclick = () => {
    ask.cfg.voice = !ask.cfg.voice;
    saveAskCfg();
    if (!ask.cfg.voice && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    renderAskHeader();
  };
  $('askSetup').onclick = () => {
    $('askSettings').hidden = !$('askSettings').hidden;
    if (!$('askSettings').hidden && askServer()) testAskServer();
  };
  $('askServer').value = ask.cfg.server || '';
  $('askServer').onchange = () => {
    ask.cfg.server = $('askServer').value.trim();
    saveAskCfg();
    testAskServer();
  };
  if (ask.cfg.model) $('askModel').append(new Option(ask.cfg.model, ask.cfg.model));
  $('askModel').onchange = () => {
    ask.cfg.model = $('askModel').value;
    saveAskCfg();
  };
  $('askTest').onclick = testAskServer;
  $('askHistory').onclick = () => {
    $('askLog').innerHTML = '';
    const log = ask.history[askLogKey()] || [];
    if (!log.length) return addAskMsg('assistant', 'No conversations saved yet.');
    for (const m of log) addAskMsg(m.role, `${m.at ? `${new Date(m.at).toLocaleString()}\n` : ''}${m.content}`);
  };
  // Ask out loud (Safari and Chrome can turn speech into text).
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  $('askMic').hidden = !Rec;
  if (Rec) {
    let rec = null;
    $('askMic').onclick = () => {
      if (rec) return rec.stop();
      rec = new Rec();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.onresult = (e) => {
        const text = [...e.results].map((r) => r[0].transcript).join('');
        $('askText').value = text;
        if (e.results[e.results.length - 1].isFinal) sendAsk(text);
      };
      rec.onend = () => {
        rec = null;
        $('askMic').classList.remove('on');
      };
      rec.onerror = (e) => toast(`Couldn't hear you (${e.error}).`);
      $('askMic').classList.add('on');
      rec.start();
    };
  }
}

// ---- Puppet Studio (live puppeteering) ----------------------------------------------
//
// A person plays a Knight Lyfe character live: the webcam (MediaPipe face tracking,
// in the browser) moves the head, eyes, brows and mouth, the microphone moves the
// mouth, and keys 1-8 add expressions and gestures. The puppet screen
// (puppet.html) shows the character on a green screen for OBS or a projector.

const puppet = {
  teacher: TEACHERS[0], background: 'green', lower: true, lowerText: '', followAsk: true,
  face: {}, head: { yaw: 0, pitch: 0, roll: 0 }, center: { yaw: 0, pitch: 0, roll: 0 },
  pose: { ...REST_POSE }, voice: 0, askMouth: 0, held: null, heldUntil: 0,
  camStream: null, landmarker: null, lastVideoTime: -1, lastFaceAt: 0,
  micStream: null, micCtx: null, analyser: null, buf: null,
  raf: 0, lastSent: '', nextBlink: 0, screenSeen: false,
};
const puppetChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('knight-puppet') : null;
document.head.append(Object.assign(document.createElement('style'), { textContent: FACE_CSS }));

function puppetSend(extra = {}) {
  puppetChannel?.postMessage({ teacher: puppet.teacher.id, background: puppet.background, lower: puppet.lower ? puppet.lowerText || true : false, ...extra });
}

function renderPuppetFace() {
  $('ppFace').innerHTML = teacherFaceSvg(puppet.teacher);
  $('ppFace').querySelector('svg').classList.remove('auto-blink');
  $('ppFace').style.background = PUPPET_BACKGROUNDS[puppet.background].css;
  $('ppTeacher').value = puppet.teacher.id;
  puppetSend();
}

function puppetStatus() {
  const bits = [];
  if (puppet.camStream) bits.push(puppet.landmarker ? (performance.now() - puppet.lastFaceAt < 500 ? '📷 Tracking your face' : '📷 Looking for your face…') : '📷 Loading face tracking…');
  if (puppet.micStream) bits.push('🎤 Voice moves the mouth');
  if (!bits.length) bits.push('Turn on 📷 Camera and/or 🎤 Voice, or use the keys.');
  bits.push(puppet.screenSeen ? '📺 Puppet screen connected' : '📺 Puppet screen not open');
  setText($('ppStatus'), bits.join(' · '));
}

async function loadLandmarker() {
  const base = new URL('../vendor/mediapipe/', import.meta.url).href;
  const { FaceLandmarker } = await import(`${base}vision_bundle.mjs`);
  const fileset = { wasmLoaderPath: `${base}wasm/vision_wasm_internal.js`, wasmBinaryPath: `${base}wasm/vision_wasm_internal.wasm` };
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: `${base}face_landmarker.task`, delegate },
    runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, opts('GPU'));
  } catch {
    return FaceLandmarker.createFromOptions(fileset, opts('CPU'));
  }
}

async function puppetToggleCamera() {
  if (puppet.camStream) return puppetStopCamera();
  try {
    puppet.camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
  } catch (err) {
    return toast(`Couldn't use the camera (${err.name === 'NotAllowedError' ? 'permission was denied' : err.message}).`);
  }
  const v = $('ppVideo');
  v.srcObject = puppet.camStream;
  v.dataset.on = '';
  await v.play().catch(() => {});
  $('ppCamera').classList.add('on');
  puppetStatus();
  if (!puppet.landmarker) {
    try {
      puppet.landmarker = await loadLandmarker();
    } catch (err) {
      console.warn('Face tracking unavailable', err);
      toast('Face tracking couldn\'t start on this browser. Voice and keys still work.');
      puppetStopCamera();
    }
  }
  puppetStatus();
}

function puppetStopCamera() {
  puppet.camStream?.getTracks().forEach((t) => t.stop());
  puppet.camStream = null;
  const v = $('ppVideo');
  v.srcObject = null;
  delete v.dataset.on;
  puppet.face = {};
  puppet.head = { yaw: 0, pitch: 0, roll: 0 };
  $('ppCamera').classList.remove('on');
  puppetStatus();
}

async function puppetToggleMic() {
  if (puppet.micStream) return puppetStopMic();
  try {
    puppet.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
  } catch (err) {
    return toast(`Couldn't use the microphone (${err.name === 'NotAllowedError' ? 'permission was denied' : err.message}).`);
  }
  puppet.micCtx = new AudioContext();
  const src = puppet.micCtx.createMediaStreamSource(puppet.micStream);
  puppet.analyser = puppet.micCtx.createAnalyser();
  puppet.analyser.fftSize = 1024;
  puppet.buf = new Float32Array(puppet.analyser.fftSize);
  src.connect(puppet.analyser);
  $('ppMic').classList.add('on');
  puppetStatus();
}

function puppetStopMic() {
  puppet.micStream?.getTracks().forEach((t) => t.stop());
  puppet.micCtx?.close();
  puppet.micStream = puppet.micCtx = puppet.analyser = null;
  puppet.voice = 0;
  $('ppMic').classList.remove('on');
  puppetStatus();
}

function puppetTrackFace(now) {
  const v = $('ppVideo');
  if (!puppet.landmarker || !puppet.camStream || v.readyState < 2 || v.currentTime === puppet.lastVideoTime) return;
  puppet.lastVideoTime = v.currentTime;
  const res = puppet.landmarker.detectForVideo(v, now);
  const shapes = res.faceBlendshapes?.[0]?.categories;
  if (!shapes) return;
  puppet.lastFaceAt = now;
  puppet.face = poseFromBlendshapes(shapes);
  const m = res.facialTransformationMatrixes?.[0]?.data;
  if (m) puppet.head = headAngles(m);
}

function puppetMicLevel() {
  if (!puppet.analyser) return 0;
  puppet.analyser.getFloatTimeDomainData(puppet.buf);
  let sum = 0;
  for (const x of puppet.buf) sum += x * x;
  return mouthFromLevel(Math.sqrt(sum / puppet.buf.length));
}

function puppetLoop(now) {
  puppet.raf = 0;
  if (!$('puppetDlg').open) return;
  puppetTrackFace(now);
  puppet.voice = puppet.voice * 0.5 + puppetMicLevel() * 0.5;
  const tracking = puppet.camStream && now - puppet.lastFaceAt < 500;
  const c = puppet.center;
  const face = tracking
    ? { ...puppet.face, ...poseFromHead({ yaw: puppet.head.yaw - c.yaw, pitch: puppet.head.pitch - c.pitch, roll: puppet.head.roll - c.roll }) }
    : { ...REST_POSE };
  // Without the camera the character still blinks now and then.
  if (!tracking) {
    if (now > puppet.nextBlink + 140) puppet.nextBlink = now + 2500 + Math.random() * 3000;
    if (now > puppet.nextBlink) face.blinkL = face.blinkR = 1;
  }
  if (puppet.held && puppet.heldUntil && now > puppet.heldUntil) setHeldGesture(null);
  const voice = Math.max(puppet.voice, puppet.followAsk ? puppet.askMouth : 0);
  puppet.pose = smoothPose(puppet.pose, combinePose(face, voice, puppet.held), 0.5);
  applyPose($('ppFace'), puppet.pose);
  const key = Object.values(puppet.pose).map((x) => x.toFixed(2)).join(',');
  if (key !== puppet.lastSent) {
    puppet.lastSent = key;
    puppetChannel?.postMessage({ pose: puppet.pose });
  }
  if (Math.floor(now / 500) !== Math.floor((now - 17) / 500)) puppetStatus();
  puppet.raf = requestAnimationFrame(puppetLoop);
}

function puppetFx(fx) {
  const el = $('ppFace').querySelector('.t-fx');
  if (el) {
    el.textContent = fx;
    el.style.animation = 'none';
    void el.getBoundingClientRect();
    el.style.animation = '';
  }
  puppetChannel?.postMessage({ fx });
}

function setHeldGesture(g, ms = 0) {
  puppet.held = g;
  puppet.heldUntil = g && ms ? performance.now() + ms : 0;
  for (const b of $('ppGestures').children) b.classList.toggle('on', b.dataset.id === g?.id);
}

function triggerGesture(g, { hold = false, ms = 1500 } = {}) {
  if (g.fx) return puppetFx(g.fx);
  setHeldGesture(g, hold ? 0 : ms);
}

function openPuppet(teacherId) {
  const dlg = $('puppetDlg');
  if (teacherId) puppet.teacher = teacherById(teacherId);
  if (!dlg.open) dlg.show();
  renderPuppetFace();
  puppetStatus();
  if (!puppet.raf) puppet.raf = requestAnimationFrame(puppetLoop);
}

function initPuppet() {
  const dlg = $('puppetDlg');
  dlg.querySelector('[data-close]').onclick = () => {
    puppetStopCamera();
    puppetStopMic();
    setHeldGesture(null);
    dlg.close();
  };
  makeDraggable(dlg);
  for (const t of TEACHERS) $('ppTeacher').append(new Option(`${t.emoji} ${t.name}`, t.id));
  $('ppTeacher').onchange = () => openPuppet($('ppTeacher').value);
  for (const [id, b] of Object.entries(PUPPET_BACKGROUNDS)) $('ppBg').append(new Option(b.label, id));
  $('ppBg').onchange = () => {
    puppet.background = $('ppBg').value;
    renderPuppetFace();
  };
  $('ppLower').onchange = () => {
    puppet.lower = $('ppLower').checked;
    puppetSend();
  };
  $('ppLowerText').oninput = () => {
    puppet.lowerText = $('ppLowerText').value.trim();
    puppetSend();
  };
  $('ppFollowAsk').checked = puppet.followAsk;
  $('ppFollowAsk').onchange = () => (puppet.followAsk = $('ppFollowAsk').checked);
  $('ppCamera').onclick = puppetToggleCamera;
  $('ppMic').onclick = puppetToggleMic;
  $('ppCenter').onclick = () => {
    puppet.center = { ...puppet.head };
    toast('Centered: the character looks straight when you do.');
  };
  $('ppScreen').onclick = () => {
    window.open('puppet.html', 'knight-puppet', 'width=1280,height=720');
    setTimeout(() => puppetSend({ pose: puppet.pose }), 600);
  };
  for (const g of GESTURES) {
    const b = document.createElement('button');
    b.className = 'mini';
    b.dataset.id = g.id;
    b.innerHTML = `<kbd>${g.key}</kbd>`;
    b.append(g.label);
    b.onclick = () => triggerGesture(g);
    $('ppGestures').append(b);
  }
  // Hold a number key for an expression (it lasts while held); gestures pop once.
  document.addEventListener('keydown', (e) => {
    if (!dlg.open || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input[type=text], textarea, [contenteditable]')) return;
    const g = GESTURES.find((x) => x.key === e.key);
    if (!g) return;
    e.preventDefault();
    e.stopPropagation();
    triggerGesture(g, { hold: true });
  }, true);
  document.addEventListener('keyup', (e) => {
    if (puppet.held && puppet.held.key === e.key && !puppet.heldUntil) setHeldGesture(null);
  });
  puppetChannel?.addEventListener('message', (e) => {
    if (!e.data?.hello) return;
    puppet.screenSeen = true;
    puppetSend({ pose: puppet.pose });
    puppetStatus();
  });
  $('askPuppet').onclick = () => openPuppet(ask.teacher?.id);
  $('chPuppet').onclick = () => openPuppet();
}

// ---- Virtual Church -----------------------------------------------------------------
//
// Plan an order of service and run it as big slides: worship songs are played by
// the Band Room (AI musicians on every part) with their words on screen, plus
// scripture, prayer, announcements, the sermon video and giving. The stream
// screen (stage.html) mirrors it for the projector or OBS -> YouTube / Facebook Live.

const church = { list: loadServices(), svc: null, sel: 0, run: 0, tab: 'plan', raf: 0, frameKey: '', stageSeen: false, padNotes: [] };
const stageChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('knight-stage') : null;
document.head.append(Object.assign(document.createElement('style'), { textContent: STAGE_CSS }));

function churchSongOptions(sel, value) {
  sel.innerHTML = '';
  const group = (label, list, prefix) => {
    if (!list.length) return;
    const g = Object.assign(document.createElement('optgroup'), { label });
    for (const x of list) g.append(new Option(x.title, `${prefix}${x.id}`));
    sel.append(g);
  };
  group('Church & worship', SONGS.filter((x) => x.category === 'church'), 'lib:');
  group('My songs', mySongs, 'my:');
  group('Other songs', SONGS.filter((x) => x.category !== 'church'), 'lib:');
  sel.value = value || sel.options[0]?.value;
}

function churchServiceList() {
  const sel = $('chService');
  sel.innerHTML = '';
  for (const x of church.list) sel.append(new Option(x.title, x.id));
  if (church.svc && !church.list.some((x) => x.id === church.svc.id)) sel.append(new Option(`${church.svc.title} (not saved)`, church.svc.id));
  if (church.svc) sel.value = church.svc.id;
}

function openService(svc) {
  church.svc = svc;
  church.sel = 0;
  church.run = 0;
  const c = svc.church;
  $('chName').value = c.name || '';
  $('chTagline').value = c.tagline || '';
  $('chColor').value = c.color || '#7c3aed';
  $('chLogo').value = c.logo || '';
  $('chGiving').value = c.giving || '';
  $('chWebsite').value = c.website || '';
  $('chSocial').value = c.social || '';
  $('chPowered').checked = svc.poweredBy !== false;
  $('chTitle').value = svc.title;
  churchServiceList();
  renderChurchPlan();
}

function readChurchFields() {
  const svc = church.svc;
  Object.assign(svc.church, { name: $('chName').value.trim(), tagline: $('chTagline').value.trim(), color: $('chColor').value, logo: $('chLogo').value.trim(), giving: $('chGiving').value.trim(), website: $('chWebsite').value.trim(), social: $('chSocial').value.trim() });
  svc.poweredBy = $('chPowered').checked;
  svc.title = $('chTitle').value.trim() || 'Worship Service';
}

function renderChurchPlan() {
  const svc = church.svc;
  const box = $('chSegs');
  box.innerHTML = '';
  svc.segments.forEach((seg, i) => {
    const row = Object.assign(document.createElement('div'), { className: 'ch-seg' });
    const pick = Object.assign(document.createElement('button'), { className: `pick mini${i === church.sel ? ' on' : ''}`, textContent: `${SEGMENT_TYPES[seg.type]?.icon || '•'} ${seg.title || SEGMENT_TYPES[seg.type]?.label}` });
    pick.onclick = () => {
      church.sel = i;
      renderChurchPlan();
    };
    const btn = (label, title, fn) => {
      const b = Object.assign(document.createElement('button'), { className: 'mini', textContent: label, title });
      b.onclick = fn;
      return b;
    };
    const move = (d) => {
      const j = i + d;
      if (j < 0 || j >= svc.segments.length) return;
      [svc.segments[i], svc.segments[j]] = [svc.segments[j], svc.segments[i]];
      church.sel = j;
      renderChurchPlan();
    };
    row.append(pick, btn('↑', 'Earlier', () => move(-1)), btn('↓', 'Later', () => move(1)), btn('✕', 'Remove', () => {
      svc.segments.splice(i, 1);
      church.sel = Math.max(0, Math.min(church.sel, svc.segments.length - 1));
      renderChurchPlan();
    }));
    box.append(row);
  });
  renderChurchEditor();
  const errors = validateService(svc);
  const st = $('chStatus');
  st.className = `small cs-status ${errors.length ? 'err' : 'ok'}`;
  st.textContent = errors.length ? `⚠ ${errors.slice(0, 3).join(' · ')}` : `✓ ${svc.segments.length} parts, ready to run.`;
}

function renderChurchEditor() {
  const box = $('chEdit');
  box.innerHTML = '';
  const seg = church.svc.segments[church.sel];
  if (!seg) return;
  const label = (text, el) => {
    const l = Object.assign(document.createElement('label'), { textContent: text });
    l.append(el);
    box.append(l);
    return el;
  };
  const input = (text, key, attrs = {}) => {
    const el = Object.assign(document.createElement(attrs.rows ? 'textarea' : 'input'), { ...attrs });
    el.value = seg[key] ?? '';
    el.oninput = () => {
      seg[key] = el.value;
      if (key === 'title') renderChurchPlanListOnly();
    };
    return label(text, el);
  };
  box.append(Object.assign(document.createElement('h4'), { textContent: `${SEGMENT_TYPES[seg.type].icon} ${SEGMENT_TYPES[seg.type].label}` }));
  input('Title on screen ', 'title', { type: 'text' });
  if (seg.type === 'song') {
    const sel = document.createElement('select');
    churchSongOptions(sel, seg.song);
    seg.song = sel.value;
    sel.onchange = () => {
      seg.song = sel.value;
      seg.title = sel.selectedOptions[0]?.textContent || seg.title;
      renderChurchPlan();
    };
    label('Song (the Band Room plays it, words on screen) ', sel);
  }
  if (['scripture', 'benediction'].includes(seg.type)) input('Reference ', 'reference', { type: 'text', placeholder: 'e.g. John 3:16 (KJV)' });
  if (seg.type !== 'song') input('Words on screen ', 'text', { rows: seg.type === 'scripture' ? 6 : 4 });
  if (['welcome', 'sermon', 'video'].includes(seg.type)) input('Video link or file address ', 'video', { type: 'text', placeholder: 'YouTube, Vimeo or .mp4 (a recorded sermon, a host welcome video...)' });
  if (seg.type === 'sermon') input('Speaker notes (only here, not on screen) ', 'notes', { rows: 3 });
  if (seg.type === 'prayer') {
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!seg.pad });
    cb.onchange = () => (seg.pad = cb.checked);
    label('Soft pad music underneath ', cb);
  }
  if (['welcome', 'announcement', 'giving'].includes(seg.type)) {
    const sel = document.createElement('select');
    sel.append(new Option('No host character', ''));
    for (const t of TEACHERS) sel.append(new Option(`${t.emoji} ${t.name}`, t.id));
    sel.value = seg.host || '';
    sel.onchange = () => (seg.host = sel.value);
    label('Host (Knight Lyfe character for an AI video) ', sel);
    const b = Object.assign(document.createElement('button'), { className: 'mini', textContent: '📝 Host video script' });
    b.onclick = () => {
      if (!seg.host) return toast('Pick a host character first.');
      const text = `${hostScript(church.svc, seg, teacherById(seg.host))}\n\n----\nCHARACTER BRIEF\n${characterBrief(teacherById(seg.host))}`;
      download(text, `${seg.title || 'host'} - video script.txt`, 'text/plain');
    };
    box.append(b);
  }
}

function renderChurchPlanListOnly() {
  const buttons = $('chSegs').querySelectorAll('.pick');
  church.svc.segments.forEach((seg, i) => buttons[i] && (buttons[i].textContent = `${SEGMENT_TYPES[seg.type]?.icon || '•'} ${seg.title || SEGMENT_TYPES[seg.type]?.label}`));
}

// ---- Running the service

function stopChurchMedia() {
  if (church.padNotes.length) {
    for (const n of church.padNotes) synth.noteOff(15, n);
    church.padNotes = [];
  }
  if (player.playing) player.pause();
}

function churchGo(i) {
  const svc = church.svc;
  if (!svc || i < 0 || i >= svc.segments.length) return;
  stopChurchMedia();
  church.run = i;
  const seg = svc.segments[i];
  if (seg.type === 'song') {
    bandSongOptions();
    $('bandSong').value = seg.song;
    if ($('bandSong').value === seg.song) buildBand();
    else toast(`Can't find the song for "${seg.title}". Pick it again in the plan.`);
  }
  if (seg.type === 'prayer' && seg.pad) {
    synth.ensure();
    synth.program(15, 89);
    church.padNotes = [48, 55, 60, 64, 67];
    for (const n of church.padNotes) synth.noteOn(15, n, 38);
  }
  church.frameKey = '';
  renderChurchRun();
}

function churchFrame() {
  const svc = church.svc;
  const seg = svc.segments[church.run];
  const extra = {};
  if (seg?.type === 'song' && state.midiName === state.channelLabels?.for) {
    const lines = songLyricLines();
    const li = lineAt(lines, player.time);
    const words = (l) => (l ? l.words.map((w) => w.text).join('').trim() : '');
    extra.lyricNow = words(lines[Math.max(0, li)]);
    extra.lyricNext = words(lines[Math.max(0, li) + 1]);
  }
  return stageFrame(svc, church.run, extra);
}

function sendFrame(force = false) {
  if (!church.svc) return;
  const frame = churchFrame();
  const key = JSON.stringify(frame);
  if (!force && key === church.frameKey) return;
  church.frameKey = key;
  renderStage($('chPreview'), frame, { muted: church.stageSeen });
  stageChannel?.postMessage({ frame });
}

function renderChurchRun() {
  const list = $('chRunList');
  list.innerHTML = '';
  church.svc.segments.forEach((seg, i) => {
    const b = Object.assign(document.createElement('button'), { className: `mini${i === church.run ? ' on' : ''}`, textContent: `${SEGMENT_TYPES[seg.type]?.icon || '•'} ${seg.title}` });
    b.onclick = () => churchGo(i);
    list.append(b);
  });
  const seg = church.svc.segments[church.run];
  setText($('chNow'), `${church.run + 1} of ${church.svc.segments.length}${seg?.notes ? ` · Notes: ${seg.notes}` : ''}`);
  $('chSongPlay').disabled = seg?.type !== 'song';
  sendFrame(true);
}

function churchLoop() {
  if (!$('churchDlg').open) {
    church.raf = 0;
    return;
  }
  church.raf = requestAnimationFrame(churchLoop);
  if (church.tab === 'run') sendFrame();
}

function churchTab(tab) {
  church.tab = tab;
  $('chTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('chPlan').hidden = tab !== 'plan';
  $('chRun').hidden = tab !== 'run';
  if (tab === 'run') {
    readChurchFields();
    renderChurchRun();
  } else stopChurchMedia();
}

/** A new service, with this church's name, colors and links when opened from its page. */
function brandedService() {
  const svc = newService(appChurch?.name || 'BAC Ministries');
  if (appChurch) Object.assign(svc.church, Object.fromEntries(Object.entries(appChurch).filter(([, v]) => v)));
  return svc;
}

function openChurch() {
  const dlg = $('churchDlg');
  if (!dlg.open) dlg.show();
  if (!church.svc) openService(church.list[0] ? JSON.parse(JSON.stringify(church.list[0])) : brandedService());
  if (!church.raf) church.raf = requestAnimationFrame(churchLoop);
}

function initChurch() {
  const dlg = $('churchDlg');
  $('btnChurch').onclick = openChurch;
  dlg.querySelector('[data-close]').onclick = () => {
    stopChurchMedia();
    dlg.close();
  };
  makeDraggable(dlg);
  for (const [type, t] of Object.entries(SEGMENT_TYPES)) $('chAddType').append(new Option(`${t.icon} ${t.label}`, type));
  $('chTabs').querySelectorAll('button').forEach((b) => (b.onclick = () => churchTab(b.dataset.tab)));
  for (const id of ['chName', 'chTagline', 'chColor', 'chLogo', 'chGiving', 'chWebsite', 'chSocial', 'chPowered', 'chTitle']) $(id).addEventListener('input', () => {
    readChurchFields();
    if (id === 'chTitle' || id === 'chName') renderChurchPlan();
  });
  $('chPowered').addEventListener('change', readChurchFields);
  $('chService').onchange = () => {
    const found = church.list.find((x) => x.id === $('chService').value);
    if (found) openService(JSON.parse(JSON.stringify(found)));
  };
  $('chAdd').onclick = () => {
    const type = $('chAddType').value;
    const seg = { type, title: SEGMENT_TYPES[type].label, text: '' };
    if (type === 'song') seg.song = 'lib:amazing';
    church.svc.segments.splice(church.sel + 1, 0, seg);
    church.sel += 1;
    renderChurchPlan();
  };
  $('chSave').onclick = () => {
    readChurchFields();
    const errors = validateService(church.svc);
    if (errors.length) return toast(`Fix this first: ${errors[0]}`);
    const i = church.list.findIndex((x) => x.id === church.svc.id);
    const copy = JSON.parse(JSON.stringify(church.svc));
    if (i >= 0) church.list[i] = copy;
    else church.list.push(copy);
    saveServices(church.list);
    churchServiceList();
    toast(`Saved: ${church.svc.title}`);
  };
  $('chNew').onclick = () => openService(appChurch ? brandedService() : newService($('chName').value.trim() || 'BAC Ministries'));
  $('chInvite').onclick = () => {
    readChurchFields();
    const post = invitePost(church.svc);
    navigator.clipboard?.writeText(post).then(() => toast('Invite post copied: paste it on Facebook, Instagram or YouTube.', [], 5000), () => download(post, 'invite post.txt', 'text/plain'));
  };
  $('chExport').onclick = () => {
    readChurchFields();
    download(JSON.stringify(church.svc, null, 1), `${church.svc.title.replace(/[\\/:*?"<>|]/g, '-')}.kservice`, 'application/json');
  };
  $('chImport').onclick = () => $('chFile').click();
  $('chFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const svc = JSON.parse(await file.text());
      const errors = validateService(svc);
      if (errors.length) return toast(`Can't use this service: ${errors[0]}`);
      openService(svc);
    } catch (err) {
      toast(`Couldn't read ${file.name}: ${err.message}`);
    }
  };
  $('chDelete').onclick = () => {
    if (!confirm(`Delete "${church.svc.title}"?`)) return;
    church.list = church.list.filter((x) => x.id !== church.svc.id);
    saveServices(church.list);
    openService(church.list[0] ? JSON.parse(JSON.stringify(church.list[0])) : newService());
  };
  $('chPrev').onclick = () => churchGo(church.run - 1);
  $('chNext').onclick = () => churchGo(church.run + 1);
  $('chSongPlay').onclick = () => togglePlay();
  $('chStage').onclick = () => {
    if (IN_HOST) return toast('The stream screen opens on the website (in Safari or Chrome).');
    window.open('stage.html', 'knight-stage', 'width=1280,height=720');
  };
  const full = () => ($('chPreview').requestFullscreen ? $('chPreview').requestFullscreen() : toast('Full screen isn\'t available here.'));
  $('chFull').onclick = full;
  $('chPreview').ondblclick = full;
  if (stageChannel) {
    stageChannel.onmessage = (e) => {
      if (e.data?.hello) {
        church.stageSeen = true;
        sendFrame(true);
      }
    };
  }
  window.addEventListener('keydown', (e) => {
    if (!dlg.open || church.tab !== 'run' || typingTarget(e)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      churchGo(church.run + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      churchGo(church.run - 1);
    }
  });
}

// ---- Lyrics (sing along) -----------------------------------------------------------
//
// The words of the open song, a line at a time, lighting up as they're sung.
// They come from the song's MIDI lyric events (library songs, your songs, karaoke
// files, MusicXML scores with lyrics and Band Room arrangements all carry them).

const lyricsView = { lines: [], for: null, raf: 0, size: 34 };

function songLyricLines() {
  if (!state.song) return [];
  if (lyricsView.for !== state.song) {
    lyricsView.for = state.song;
    lyricsView.lines = lyricLines(state.song.lyrics || []);
  }
  return lyricsView.lines;
}

/** Fill an element with a line's words, colored up to `time`. */
function renderLyricLine(el, line, time) {
  el.textContent = '';
  if (!line) return;
  line.words.forEach((w, i) => {
    const span = document.createElement('span');
    span.textContent = w.text;
    const next = line.words[i + 1]?.time ?? line.end;
    if (time !== null && w.time <= time + 0.03) span.className = time < next ? 'now' : 'sung';
    el.append(span);
  });
}

function lyricsLoop() {
  if (!$('lyricsDlg').open) {
    lyricsView.raf = 0;
    return;
  }
  lyricsView.raf = requestAnimationFrame(lyricsLoop);
  const lines = songLyricLines();
  const t = player.time;
  const i = lineAt(lines, t);
  const key = `${i}:${lines.length}:${Math.round(t * 20)}`;
  if (key === lyricsView.key) return;
  lyricsView.key = key;
  renderLyricLine($('lyPrev'), lines[i - 1], null);
  // Before the first line, show it coming up.
  renderLyricLine($('lyNow'), lines[Math.max(0, i)], i < 0 ? null : t);
  renderLyricLine($('lyNext'), lines[Math.max(0, i) + 1], null);
}

function openLyrics() {
  const dlg = $('lyricsDlg');
  if (!dlg.open) dlg.show();
  const lines = songLyricLines();
  $('lyricsEmpty').hidden = lines.length > 0;
  $('lyricsView').hidden = !lines.length;
  setText($('lyricsSong'), state.song ? state.song.title || state.midiName || '' : '');
  const verses = state.songVerses || [];
  $('lyricsMore').hidden = !verses.length;
  $('lyricsVerses').innerHTML = '';
  verses.forEach((v, k) => {
    const pre = document.createElement('pre');
    pre.textContent = `${k + 2}. ${v}`;
    $('lyricsVerses').append(pre);
  });
  lyricsView.key = '';
  if (!lyricsView.raf) lyricsView.raf = requestAnimationFrame(lyricsLoop);
}

function initLyrics() {
  const dlg = $('lyricsDlg');
  $('btnLyrics').onclick = openLyrics;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  makeDraggable(dlg);
  const size = (d) => {
    lyricsView.size = Math.max(20, Math.min(72, lyricsView.size + d));
    $('lyricsView').style.setProperty('--ly-size', `${lyricsView.size}px`);
  };
  $('lyricsSmaller').onclick = () => size(-4);
  $('lyricsBigger').onclick = () => size(4);
}

// ---- Band Room ----------------------------------------------------------------
//
// Rehearse as a worship band or a choir with whoever showed up: every part is a
// channel of an arrangement made for the song, played by the AI, played quietly
// as a guide, played by one of you (the AI drops out), or off.

const band = { mode: 'band', arr: null, bytes: null, raf: 0, assign: { band: {}, choir: {} } };
const CHOIR_IDS = ['soprano', 'alto', 'tenor', 'choirbass'];
const BAND_IDS = ['keys', 'guitar', 'bass', 'organ', 'drums'];
const BAND_ROWS = {
  band: [...['lead', ...BAND_IDS].map((id) => ({ id, roles: [id] })), { id: 'choir', name: 'Choir (S A T B)', icon: '⛪', roles: CHOIR_IDS }, { id: 'click', roles: ['click'] }],
  choir: [...CHOIR_IDS.map((id) => ({ id, roles: [id] })), { id: 'accomp', name: 'Accompaniment', icon: '🎹', roles: BAND_IDS, accomp: true }, { id: 'lead', roles: ['lead'] }, { id: 'click', roles: ['click'] }],
};
const BAND_DEFAULTS = {
  band: { lead: 'guide', keys: 'ai', guitar: 'ai', bass: 'ai', organ: 'off', drums: 'ai', choir: 'off', click: 'off' },
  choir: { soprano: 'ai', alto: 'ai', tenor: 'ai', choirbass: 'ai', accomp: 'keys', lead: 'off', click: 'off' },
};
const roleInfo = (id) => BAND_ROLES.find((r) => r.id === id);

function bandSongOptions() {
  const sel = $('bandSong');
  const prev = sel.value;
  sel.innerHTML = '';
  sel.append(new Option('The song that\'s open', 'open'));
  const group = (label, list, prefix) => {
    if (!list.length) return;
    const g = Object.assign(document.createElement('optgroup'), { label });
    for (const x of list) g.append(new Option(x.title, `${prefix}${x.id}`));
    sel.append(g);
  };
  group('Church & worship', SONGS.filter((x) => x.category === 'church'), 'lib:');
  group('My songs', mySongs, 'my:');
  group('Starter songs', SONGS.filter((x) => x.category !== 'church'), 'lib:');
  sel.value = [...sel.options].some((o) => o.value === prev) ? prev : state.librarySong ? `lib:${state.librarySong}` : 'open';
  const drums = $('bandDrums');
  if (drums.options.length <= 1) for (const [id, name] of Object.entries(DRUM_STYLE_NAMES)) drums.append(new Option(name, id));
}

/** The song to arrange: { song (beats), melody, chords, drums, title }. */
function bandSource() {
  const v = $('bandSong').value;
  let entry = null;
  if (v.startsWith('lib:')) entry = SONGS.find((x) => x.id === v.slice(4));
  else if (v.startsWith('my:')) entry = mySongs.find((x) => x.id === v.slice(3));
  else if (state.librarySong) entry = SONGS.find((x) => x.id === state.librarySong) || mySongs.find((x) => x.id === state.librarySong);
  if (entry) {
    const song = buildSong(parseMidi(entryMidi(entry)));
    song.title = entry.title;
    const chart = entry.type !== 'midi' && entry.chords;
    const { song: sb, melody, lyrics } = songInBeats(song, entry.type === 'midi' ? song.channels.find((c) => c !== DRUM_CHANNEL) ?? null : entry.melody ? 0 : null);
    return { song: sb, melody, lyrics, verses: entry.verses, chords: chart ? chordsFromChart(entry.chords) : null, drums: entry.drums, title: entry.title };
  }
  if (!state.song) return null;
  // Any MIDI file: the first melodic part is the melody, the chords come from the notes.
  const song = state.song;
  const mel = song.channels.find((c) => c !== DRUM_CHANNEL);
  const { song: sb, melody, lyrics } = songInBeats({ ...song, title: song.title || state.midiName }, mel ?? null);
  return { song: sb, melody, lyrics, verses: state.songVerses, chords: null, drums: undefined, title: song.title || state.midiName || 'Song' };
}

function buildBand() {
  const src = bandSource();
  if (!src) return toast('Open a song first, or pick one from the list.');
  const drumSel = $('bandDrums').value;
  const arr = arrangeBand(src.song, {
    chords: src.chords,
    melody: src.melody,
    lyrics: src.lyrics,
    level: Number($('bandLevel').value),
    drums: drumSel === 'auto' ? src.drums ?? undefined : drumSel || null,
  });
  arr.title = src.title;
  const vowel = Number($('bandVowel').value);
  for (const t of arr.tracks) if (CHOIR_IDS.includes(t.role)) t.program = vowel;
  band.arr = arr;
  band.bytes = bandMidi(arr);
  if (learn.enabled) setLearn(false);
  loadMidiBytes(band.bytes, `${src.title} (band).mid`);
  state.songVerses = src.verses || null;
  scoreView.hidden = new Set([11, 12]); // the click and count-in don't belong on the printed score
  state.channelLabels = { for: state.midiName };
  for (const r of BAND_ROLES) state.channelLabels[r.ch] = r.name;
  state.channelLabels[12] = 'Count-in';
  applyBand();
  setText($('bandInfo'), `${src.title} · ${arr.chords.length} chord changes · ${Math.round((arr.beats - arr.offset) / ((arr.timeSig.num * 4) / arr.timeSig.den))} bars`);
  player.seek(0);
  player.play();
}

/** What each part is set to in the tab that's showing. */
function bandAssign(mode = band.mode) {
  return { ...BAND_DEFAULTS[mode], ...band.assign[mode] };
}

/** Mute / volume every band channel from the assignments. */
function applyBand() {
  if (!band.arr || state.midiName !== state.channelLabels?.for) return;
  const a = bandAssign();
  const level = {};
  for (const row of BAND_ROWS[band.mode]) {
    const v = a[row.id];
    for (const id of row.roles) {
      if (row.accomp) level[id] = v === 'band' || (v === 'keys' && id === 'keys') || (v === 'organ' && id === 'organ') ? 1 : 0;
      else level[id] = v === 'ai' ? 1 : v === 'guide' ? 0.3 : 0;
    }
  }
  // Parts this tab doesn't show stay as the other tab left them, except the choir/band split.
  for (const r of BAND_ROLES) {
    const c = state.chan[r.ch];
    const v = level[r.id] ?? 0;
    c.mute = v === 0;
    c.mix = v || 1;
    synth.setMix(r.ch, c.mix);
  }
  applyMutes();
  buildMixer();
  renderBandRoles();
}

function renderBandRoles() {
  const box = $('bandRoles');
  box.innerHTML = '';
  const a = bandAssign();
  const choirTab = band.mode === 'choir';
  for (const row of BAND_ROWS[band.mode]) {
    const info = roleInfo(row.id) || {};
    const el = Object.assign(document.createElement('div'), { className: 'band-role' });
    const v = a[row.id];
    if (v === 'off' || v === 'none') el.classList.add('off');
    if (v === 'live' || String(v).startsWith('p:')) el.classList.add('live');
    const icon = Object.assign(document.createElement('span'), { className: 'icon', textContent: row.icon || info.icon || '' });
    const nm = Object.assign(document.createElement('span'), { className: 'nm', textContent: row.name || info.name });
    // Choir parts: show their range so singers know which one is theirs.
    if (band.arr && row.roles.length === 1 && CHOIR_IDS.includes(row.id)) {
      const t = band.arr.tracks.find((x) => x.role === row.id);
      if (t?.notes.length) nm.append(Object.assign(document.createElement('small'), { textContent: `${noteLabel(Math.min(...t.notes.map((n) => n.note)))} – ${noteLabel(Math.max(...t.notes.map((n) => n.note)))}` }));
    }
    const sel = document.createElement('select');
    if (row.accomp) {
      for (const [val, label] of [['band', '🤖 Full AI band'], ['keys', '🎹 AI keys only'], ['organ', '⛪ AI organ only'], ['none', 'A cappella (none)']]) sel.append(new Option(label, val));
    } else {
      const sing = choirTab || CHOIR_IDS.includes(row.id) || row.id === 'choir' || row.id === 'lead';
      // A Knight Lyfe character fills the position when nobody from the family is on it.
      const who = characterFor(row.roles[0]);
      const choirPart = CHOIR_IDS.includes(row.id) || row.id === 'choir';
      sel.append(new Option(row.id === 'click' ? '🤖 Click on' : choirPart ? `🤖 AI choir (${who.name})` : `🤖 ${who.name} ${sing ? 'sings' : 'plays'} it`, 'ai'));
      sel.append(new Option(sing ? '🔉 Quiet guide' : '🔉 AI quietly', 'guide'));
      if (row.id !== 'click') {
        if (sing) sel.append(new Option('🙋 We sing it (AI off)', 'live'));
        for (const p of stage.players) sel.append(new Option(`🙋 ${p.name} ${sing ? 'sings' : 'plays'} it`, `p:${p.id}`));
      }
      sel.append(new Option('Off', 'off'));
    }
    sel.value = [...sel.options].some((o) => o.value === v) ? v : sel.options[0].value;
    sel.onchange = () => {
      band.assign[band.mode][row.id] = sel.value;
      applyBand();
      renderBandRoles();
    };
    el.append(icon, nm);
    if ((v === 'ai' || v === 'guide') && row.id !== 'click' && !row.accomp) el.append(teacherAvatar(characterFor(row.roles[0]), 24));
    el.append(sel);
    box.append(el);
  }
}

// Big "now / next" chord display, transposed like the music.
function bandLoop() {
  if (!$('bandDlg').open) {
    band.raf = 0;
    return;
  }
  band.raf = requestAnimationFrame(bandLoop);
  const arr = band.arr;
  if (!arr || !state.song || state.midiName !== state.channelLabels?.for) return;
  const beat = state.song.beatAt(player.time);
  const barLen = (arr.timeSig.num * 4) / arr.timeSig.den;
  const i = arr.chords.findIndex((c) => beat >= c.beat - 0.02 && beat < c.beat + c.beats - 0.02);
  const cur = arr.chords[i];
  const next = arr.chords[i >= 0 ? i + 1 : arr.chords.findIndex((c) => c.beat > beat)];
  const tr = state.transpose || 0;
  setText($('bandChord'), cur ? transposeSymbol(cur.symbol, tr) : beat < arr.offset ? '…' : '–');
  setText($('bandNext'), next ? transposeSymbol(next.symbol, tr) : '');
  const lines = songLyricLines();
  const li = lineAt(lines, player.time);
  renderLyricLine($('bandLyric'), lines[Math.max(0, li)], li < 0 ? null : player.time);
  if (beat < arr.offset) setText($('bandBar'), `Count-in: ${Math.floor(beat) + 1}`);
  else setText($('bandBar'), `Bar ${Math.floor((beat - arr.offset) / barLen) + 1} of ${Math.round((arr.beats - arr.offset) / barLen)} · beat ${Math.floor((beat - arr.offset) % barLen) + 1}`);
}

function openBand() {
  const dlg = $('bandDlg');
  if (!dlg.open) dlg.show();
  bandSongOptions();
  renderBandRoles();
  setText($('bandKey'), String(state.transpose || 0));
  if (!band.raf) band.raf = requestAnimationFrame(bandLoop);
}

function initBand() {
  const dlg = $('bandDlg');
  $('btnBand').onclick = openBand;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  makeDraggable(dlg);
  $('bandDrums').append(new Option('Song\'s own groove', 'auto'));
  $('bandDrums').value = 'auto';
  for (const b of $('bandTabs').querySelectorAll('button')) {
    b.onclick = () => {
      band.mode = b.dataset.mode;
      $('bandTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      applyBand();
      renderBandRoles();
    };
  }
  $('bandBuild').onclick = buildBand;
  for (const id of ['bandLevel', 'bandDrums', 'bandVowel']) $(id).onchange = () => band.arr && buildBand();
  $('bandTempo').oninput = () => {
    setText($('bandTempoVal'), `${$('bandTempo').value}%`);
    setRate($('bandTempo').value / 100);
  };
  const key = (d) => {
    state.transpose = Math.max(-6, Math.min(6, (state.transpose || 0) + d));
    updateTransposeUI();
    setText($('bandKey'), `${state.transpose > 0 ? '+' : ''}${state.transpose}`);
  };
  $('bandKeyDown').onclick = () => key(-1);
  $('bandKeyUp').onclick = () => key(1);
  $('bandPlay').onclick = () => togglePlay();
  $('bandMidi').onclick = () => {
    if (!band.bytes) return toast('Start a rehearsal first.');
    download(band.bytes, `${band.arr.title} - band.mid`, 'audio/midi');
  };
}

// ---- Full score (sheet music) ---------------------------------------------------
//
// Every instrument of the open song on its own staff, engraved by
// OpenSheetMusicDisplay (vendor/osmd); print it, save it as PDF or MusicXML.
// Sheet music saved as MusicXML opens as a song (score -> MIDI).

const scoreView = { osmd: null, lib: null, xml: '', key: '', zoom: 0.85, cursorAt: -1, raf: 0, hidden: new Set() };

function loadOsmd() {
  if (window.opensheetmusicdisplay) return Promise.resolve(window.opensheetmusicdisplay);
  scoreView.lib ??= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'vendor/osmd/opensheetmusicdisplay.min.js';
    el.onload = () => resolve(window.opensheetmusicdisplay);
    el.onerror = () => reject(new Error('the score engraver did not load'));
    document.head.append(el);
  });
  return scoreView.lib;
}

/** Score -> MIDI: open a MusicXML / .mxl file as the song, and keep the original score to show. */
async function openScoreFile(file) {
  const xml = await scoreFileText(file.name, new Uint8Array(await file.arrayBuffer()));
  const res = musicXmlToMidi(xml);
  if (!res.notes) throw new Error('no notes in that score');
  const name = (res.title || file.name.replace(/\.[^.]+$/, '')).trim();
  loadMidiBytes(res.bytes, `${name}.mid`);
  state.scoreXml = { xml, for: state.midiName };
  if ($('scoreDlg').open) renderScore();
  toast(`Score → MIDI: ${name} (${res.parts.length} part${res.parts.length > 1 ? 's' : ''}, ${res.measures} bars, ${res.notes} notes).`, [
    ['⬇ Save as MIDI', () => download(res.bytes, `${name}.mid`, 'audio/midi')],
    ['📜 Show score', () => openScore()],
  ], 8000);
}

function currentScoreXml() {
  const song = state.song;
  if (!song) return null;
  const original = state.scoreXml?.for === state.midiName && $('scoreSource').value === 'original';
  if (original) return { xml: state.scoreXml.xml, key: `orig:${state.midiName}`, original: true };
  const melodic = song.channels.filter((ch) => !scoreView.hidden.has(ch));
  const gridVal = $('scoreGrid').value;
  const key = `${state.midiName}|${song.notes.length}|${gridVal}|${melodic.join(',')}|${state.chan.map((c) => c.program).join(',')}`;
  if (key === scoreView.key && scoreView.xml) return { xml: scoreView.xml, key };
  const score = songToScore(song, {
    grid: gridVal === 'auto' ? 'auto' : Number(gridVal),
    title: song.title || state.librarySong && SONGS.find((x) => x.id === state.librarySong)?.title || state.midiName || 'Score',
    nameFor: (ch) => channelName(ch),
    channels: melodic,
  });
  return { xml: scoreToMusicXML(score), key, score };
}

function renderScoreParts() {
  const box = $('scoreParts');
  box.innerHTML = '';
  const song = state.song;
  const original = state.scoreXml?.for === state.midiName && $('scoreSource').value === 'original';
  if (!song || original) return;
  for (const ch of song.channels) {
    const label = document.createElement('label');
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !scoreView.hidden.has(ch) });
    cb.onchange = () => {
      if (cb.checked) scoreView.hidden.delete(ch);
      else if (song.channels.filter((c) => !scoreView.hidden.has(c)).length > 1) scoreView.hidden.add(ch);
      else cb.checked = true; // keep at least one part
      renderScore();
    };
    label.append(cb, ` ${channelName(ch)}`);
    box.append(label);
  }
}

async function renderScore() {
  const view = $('scoreView');
  $('scoreSourceWrap').hidden = state.scoreXml?.for !== state.midiName;
  const original = state.scoreXml?.for === state.midiName && $('scoreSource').value === 'original';
  $('scoreGrid').disabled = original;
  renderScoreParts();
  const cur = currentScoreXml();
  if (!cur) {
    view.innerHTML = '<p class="score-empty">Open a song (Songs, Open…, or Audio → MIDI) to see its full score.</p>';
    setText($('scoreInfo'), '');
    return;
  }
  scoreView.xml = cur.xml;
  scoreView.key = cur.key;
  setText($('scoreInfo'), cur.score ? `${cur.score.parts.length} part${cur.score.parts.length > 1 ? 's' : ''} · ${cur.score.measures} bars` : 'Original score');
  try {
    const lib = await loadOsmd();
    if (!scoreView.osmd) {
      view.innerHTML = '';
      scoreView.osmd = new lib.OpenSheetMusicDisplay(view, { autoResize: true, backend: 'svg', drawTitle: true, drawPartNames: true, followCursor: false });
    }
    await scoreView.osmd.load(cur.xml);
    scoreView.osmd.zoom = scoreView.zoom;
    scoreView.osmd.render();
    scoreView.cursorAt = -1;
    if ($('scoreFollow').checked) scoreView.osmd.cursor.show();
  } catch (err) {
    console.error(err);
    scoreView.osmd = null;
    view.innerHTML = `<p class="score-empty">Couldn't draw this score (${err.message}). ⬇ MusicXML still works: open it in MuseScore or Logic.</p>`;
  }
}

// The cursor follows the music (generated scores line up beat for beat).
function followScore() {
  const dlg = $('scoreDlg');
  if (!dlg.open) {
    scoreView.raf = 0;
    return;
  }
  scoreView.raf = requestAnimationFrame(followScore);
  const osmd = scoreView.osmd;
  if (!osmd || !state.song || !$('scoreFollow').checked || !(player.playing || player.waiting)) return;
  const cursor = osmd.cursor;
  const target = state.song.beatAt(player.time) / 4 + 1e-4; // whole notes
  const at = () => cursor.iterator.currentTimeStamp.RealValue;
  if (at() > target + 0.01) cursor.reset();
  let moved = false;
  let guard = 0;
  while (!cursor.iterator.EndReached && at() + 1e-4 < target && guard++ < 512) {
    cursor.next();
    moved = true;
  }
  if (moved && at() > target + 1e-3 && guard > 0) cursor.previous?.();
  if (moved && cursor.cursorElement) {
    const el = cursor.cursorElement;
    const box = $('scoreView');
    const top = el.offsetTop;
    if (top < box.scrollTop + 20 || top > box.scrollTop + box.clientHeight - 120) box.scrollTo({ top: Math.max(0, top - 60), behavior: 'smooth' });
  }
}

function openScore() {
  const dlg = $('scoreDlg');
  if (!dlg.open) dlg.show();
  renderScore();
  if (!scoreView.raf) scoreView.raf = requestAnimationFrame(followScore);
}

function initScore() {
  const dlg = $('scoreDlg');
  $('btnScore').onclick = openScore;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  makeDraggable(dlg);
  $('scoreGrid').onchange = renderScore;
  $('scoreSource').onchange = renderScore;
  $('scoreFollow').onchange = () => {
    if (!scoreView.osmd) return;
    if ($('scoreFollow').checked) scoreView.osmd.cursor.show();
    else scoreView.osmd.cursor.hide();
  };
  const zoom = (f) => {
    scoreView.zoom = Math.max(0.4, Math.min(2, scoreView.zoom * f));
    if (!scoreView.osmd) return;
    scoreView.osmd.zoom = scoreView.zoom;
    scoreView.osmd.render();
  };
  $('scoreZoomIn').onclick = () => zoom(1.15);
  $('scoreZoomOut').onclick = () => zoom(1 / 1.15);
  $('scoreOpen').onclick = () => $('scoreFile').click();
  $('scoreFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) await openScoreFile(file).catch((err) => toast(`Couldn't open ${file.name}: ${err.message}`));
  };
  const baseName = () => (state.song?.title || state.midiName || 'score').replace(/[\\/:*?"<>|]/g, '-');
  $('scoreXml').onclick = () => {
    const cur = currentScoreXml();
    if (!cur) return toast('Open a song first.');
    download(cur.xml, `${baseName()}.musicxml`, 'application/vnd.recordare.musicxml+xml');
  };
  $('scoreMidi').onclick = () => {
    if (!state.midiBytes) return toast('Open a song first.');
    download(state.midiBytes, `${baseName()}.mid`, 'audio/midi');
  };
  $('scorePrint').onclick = () => {
    if (!scoreView.osmd) return toast('Open a song first.');
    if (IN_HOST) return toast('Printing works on the website. Here: ⬇ MusicXML, then open it in MuseScore or Logic to print.');
    document.body.classList.add('print-score');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-score'), { once: true });
    window.print();
  };
}

// ---- Vocal Booth -------------------------------------------------------------
//
// For singers: a live pitch line over the song's notes (like Melodyne's blobs),
// a tuner and your range; plus four-part choir parts (SATB) for any song, to
// learn your part with the mic or export for ACE Studio, a choir plug-in or Logic.

const booth = { trace: [], range: new RangeFinder(), off: null, raf: 0, choir: null, last: null };
const noteLabel = (n) => `${noteLetter(n)}${Math.floor(n / 12) - 1}`;

function boothPitch(exact) {
  const now = performance.now() / 1000;
  booth.trace.push({ t: now, n: exact });
  while (booth.trace.length && booth.trace[0].t < now - 12) booth.trace.shift();
  booth.range.push(exact === null ? null : Math.round(exact));
  booth.last = exact;
}

function boothMelodyChannels() {
  const v = $('boothMelody').value;
  return v === '' ? null : [Number(v)];
}

function renderBoothInfo() {
  const prof = stage.voice?.[stage.current];
  const rf = booth.range;
  const low = rf.low ?? prof?.low;
  const high = rf.high ?? prof?.high;
  setText($('boothRange'), low != null && high > low ? `${noteLabel(low)} – ${noteLabel(high)} (${voiceType(low, high).name})` : '–');
  setText($('boothVoice'), prof ? `${stagePlayer().name}: ${voiceType(prof.low, prof.high).name}` : '');
  const sel = $('boothMelody');
  const prev = sel.value;
  sel.innerHTML = '';
  const melodic = (state.song?.channels || []).filter((ch) => ch !== DRUM_CHANNEL);
  for (const ch of melodic) sel.append(new Option(`Ch ${ch + 1}: ${channelName(ch)}`, String(ch)));
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  $('boothMake').disabled = !melodic.length;
  if (!melodic.length) setText($('boothChoirInfo'), 'Open a song first (Songs button, or any MIDI file), then make its choir parts.');
}

function drawBooth() {
  const cv = $('boothCanvas');
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || 760;
  const h = cv.clientHeight || 300;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  // Pitch range: your voice (from your range) or a wide default.
  const prof = stage.voice?.[stage.current];
  const lo = Math.max(28, (booth.range.low ?? prof?.low ?? 45) - 5);
  const hi = Math.min(96, Math.max(lo + 18, (booth.range.high ?? prof?.high ?? 76) + 5));
  const rowH = h / (hi - lo + 1);
  const y = (n) => h - (n - lo + 0.5) * rowH;
  const left = 34;
  for (let n = lo; n <= hi; n++) {
    const black = [1, 3, 6, 8, 10].includes(n % 12);
    g.fillStyle = black ? '#171a21' : '#1c2029';
    g.fillRect(left, y(n) - rowH / 2, w - left, rowH);
    if (n % 12 === 0 || n % 12 === 7) {
      g.fillStyle = '#7d8597';
      g.font = '11px system-ui';
      g.fillText(noteLabel(n), 2, y(n) + 4);
    }
  }
  const pxPerSec = (w - left) / 8;
  const nowX = left + (w - left) * 0.7;
  // The song's notes for the part you sing (or the melody).
  if (state.song) {
    const chs = learn.enabled && !learn.drums ? learn.channels : new Set(boothMelodyChannels() || [state.song.channels.find((c) => c !== DRUM_CHANNEL)]);
    const t = player.time;
    const rate = player.rate || 1;
    for (const n of state.song.notes) {
      if (!chs.has(n.ch)) continue;
      const x0 = nowX + ((n.time - t) / rate) * pxPerSec;
      const x1 = nowX + ((n.time + n.dur - t) / rate) * pxPerSec;
      if (x1 < left || x0 > w) continue;
      // Show the note in the octave you sing, if it's out of view.
      let nn = n.note + player.transpose;
      while (nn > hi) nn -= 12;
      while (nn < lo) nn += 12;
      const want = learn.expected.has(n.note + player.transpose);
      g.fillStyle = want ? '#ffd60a' : 'rgba(79, 140, 255, .55)';
      const bx = Math.max(left, x0);
      g.beginPath();
      if (g.roundRect) g.roundRect(bx, y(nn) - rowH * 0.45, Math.max(3, x1 - bx), rowH * 0.9, Math.min(6, rowH / 2));
      else g.rect(bx, y(nn) - rowH * 0.45, Math.max(3, x1 - bx), rowH * 0.9);
      g.fill();
    }
  }
  // Your voice: green when you're within 25 cents of a note.
  const now = performance.now() / 1000;
  g.lineWidth = 3;
  g.lineCap = 'round';
  let prev = null;
  for (const p of booth.trace) {
    if (p.n === null || p.n < lo - 1 || p.n > hi + 1) {
      prev = null;
      continue;
    }
    const pt = { x: nowX - (now - p.t) * pxPerSec, y: h - (p.n - lo + 0.5) * rowH, n: p.n };
    if (prev && pt.x >= left) {
      const off = Math.abs(p.n - Math.round(p.n)) * 100;
      g.strokeStyle = off <= 25 ? '#73d13d' : off <= 40 ? '#ffd666' : '#ff7875';
      g.beginPath();
      g.moveTo(prev.x, prev.y);
      g.lineTo(pt.x, pt.y);
      g.stroke();
    }
    prev = pt;
  }
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(nowX, 0);
  g.lineTo(nowX, h);
  g.stroke();

  // Tuner.
  const el = $('boothNote');
  if (booth.last == null) {
    el.className = 'booth-note';
    setText(el, '–');
    setText($('boothCents'), micListener?.active ? 'Sing a note' : 'Turn on the microphone');
  } else {
    const { midi, cents } = freqToCents(midiToFreq(booth.last));
    el.className = `booth-note ${Math.abs(cents) <= 15 ? 'good' : Math.abs(cents) <= 30 ? 'near' : 'far'}`;
    setText(el, noteLabel(midi));
    setText($('boothCents'), cents === 0 ? 'In tune' : `${cents > 0 ? '+' : ''}${cents} cents ${cents > 0 ? '(sharp)' : '(flat)'}`);
  }
  if (booth.range.low !== null) renderBoothRangeOnly();
}

let boothRangeShown = '';
function renderBoothRangeOnly() {
  const key = `${booth.range.low}-${booth.range.high}`;
  if (key === boothRangeShown) return;
  boothRangeShown = key;
  renderBoothInfo();
  if (booth.range.span >= 5) {
    stage.voice ??= {};
    stage.voice[stage.current] = { low: booth.range.low, high: booth.range.high, type: voiceType(booth.range.low, booth.range.high).id };
    saveStage(stage);
  }
}

function boothLoop() {
  if (!$('boothDlg').open) {
    booth.raf = 0;
    return;
  }
  drawBooth();
  booth.raf = requestAnimationFrame(boothLoop);
}

function openBooth() {
  const dlg = $('boothDlg');
  if (!dlg.open) dlg.show();
  booth.off ??= onPitch(boothPitch);
  renderBoothInfo();
  if (!booth.raf) booth.raf = requestAnimationFrame(boothLoop);
}

function makeChoir() {
  if (!state.song) return toast('Open a song first.');
  const parts = makeChoirParts(state.song, { melodyChannels: boothMelodyChannels() });
  if (!parts.soprano.length) return toast('No melody notes in that part. Pick another part as the melody.');
  const title = `${state.song.title || state.midiName || 'Song'} - choir`;
  const bytes = choirMidi(parts, { bpm: state.song.bpm, title, keySig: state.song.keySig, timeSig: state.song.timeSig, program: Number($('boothVowel').value) });
  booth.choir = { parts, bytes, title };
  ['boothOpen', 'boothLearn', 'boothDownload'].forEach((id) => ($(id).disabled = false));
  setText($('boothChoirInfo'), `✓ ${parts.soprano.length} chords in four parts: ${CHOIR_PARTS.map((p) => `${p.name} ${noteLabel(Math.min(...parts[p.id].map((n) => n.note)))}–${noteLabel(Math.max(...parts[p.id].map((n) => n.note)))}`).join(', ')}. Check it by ear: it's a starting point, not a hymnal.`);
  // Start on your own part if we know your voice.
  const prof = stage.voice?.[stage.current];
  if (prof) $('boothPart').value = String({ soprano: 0, mezzo: 0, alto: 1, tenor: 2, baritone: 3, bass: 3 }[prof.type] ?? 0);
}

function openChoirSong() {
  if (!booth.choir) return false;
  if (state.midiName !== booth.choir.title) {
    if (learn.enabled) setLearn(false);
    loadMidiBytes(booth.choir.bytes, `${booth.choir.title}.mid`);
  }
  return true;
}

function initBooth() {
  const dlg = $('boothDlg');
  $('btnBooth').onclick = openBooth;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  makeDraggable(dlg);
  $('boothMic').hidden = !micSupported();
  $('boothNoMic').hidden = micSupported();
  $('boothMic').onclick = () => toggleMic();
  $('boothRangeReset').onclick = () => {
    booth.range = new RangeFinder();
    boothRangeShown = '';
    renderBoothInfo();
  };
  $('boothMake').onclick = makeChoir;
  $('boothVowel').onchange = () => booth.choir && makeChoir();
  $('boothOpen').onclick = () => {
    if (!openChoirSong()) return;
    player.seek(0);
    player.play();
    renderBoothInfo();
  };
  $('boothLearn').onclick = () => {
    if (!openChoirSong()) return;
    $('learnPart').value = $('boothPart').value;
    setLearn(true);
    if (micSupported()) toggleMic(true);
    player.seek(0);
    player.play();
    toast(`Sing the ${CHOIR_PARTS[Number($('boothPart').value)].name.toLowerCase()} part: the choir waits for each of your notes (any octave counts).`, [], 5000);
  };
  $('boothDownload').onclick = () => booth.choir && download(booth.choir.bytes, `${booth.choir.title}.mid`, 'audio/midi');
}

// ---- Stage (game mode) ---------------------------------------------------
//
// Play a part in real time and get judged on every note, Guitar Hero style.
// Perform mode scores you; Practice mode is Learn (the song waits) on the big
// highway. Family profiles, crowns, unlockable courses and a leaderboard.

const stage = loadStage();
const stageRun = {
  phase: 'menu', // menu | count | play | results
  course: 'church', // church | starter | mine
  level: 'beginner',
  part: '0',
  mode: 'perform',
  speed: 1,
  song: null, // library song, or null for the song that's open
  key: '', // score key for the song
  session: null,
  lanes: [],
  laneFor: null, // note -> lane index (or -1 for the kick bar)
  drums: false,
  countStart: 0,
  leadIn: 3,
  pops: [],
  seenEvents: 0,
  savedLoop: null,
  lastCount: -1,
};
const STAGE_DRUM_LANES = LANES.filter((l) => l.id !== 'kick');
const POP = { perfect: ['PERFECT', '#73d13d'], great: ['GREAT', '#36cfc9'], good: ['GOOD', '#fadb14'], miss: ['MISS', '#ff4d4f'], extra: ['✕', '#ff4d4f'] };
const crownsHtml = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'crown-off'}">👑</span>`).join('');
const stagePlayer = () => stage.players.find((p) => p.id === stage.current) || stage.players[0];
const partName = (part) => ({ 0: 'Right hand', 1: 'Left hand', '0,1': 'Both hands', 9: 'Drums' })[part] || `Part ${part}`;

const LEVEL_RANK = { Beginner: 0, Easy: 1, Intermediate: 2, Advanced: 3 };
/** Built-in songs of a category, easiest first. */
const songsIn = (category) => SONGS.filter((s) => s.category === category).sort((a, b) => (LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9));

function stageSongs(part) {
  const list = stageRun.course === 'mine' ? mySongs : songsIn(stageRun.course);
  return list.filter((s) => part !== String(DRUM_CHANNEL) || s.drums || s.type === 'midi');
}

/** Scores are kept per song and arrangement level (Beginner keeps the plain song id). */
const stageSongKey = (song) => (stageRun.level === 'beginner' ? song.id : `${song.id}@${stageRun.level}`);

function renderStageMenu() {
  const me = stagePlayer();
  const chip = $('stagePlayerChip');
  chip.textContent = `🎮 ${me.name}`;
  chip.style.setProperty('--chip', me.color);
  const players = $('stagePlayers');
  players.innerHTML = '';
  for (const p of stage.players) {
    const b = Object.assign(document.createElement('button'), { className: `stage-player${p.id === me.id ? ' on' : ''}`, textContent: p.name, title: 'Double-click to rename' });
    b.style.setProperty('--pc', p.color);
    b.onclick = () => {
      stage.current = p.id;
      saveStage(stage);
      renderStageMenu();
    };
    b.ondblclick = () => {
      const name = prompt('Player name', p.name);
      if (name && name.trim()) {
        p.name = name.trim().slice(0, 20);
        saveStage(stage);
        renderStageMenu();
      }
    };
    players.append(b);
  }
  document.querySelectorAll('#stageParts button').forEach((b) => b.classList.toggle('on', b.dataset.part === stageRun.part));
  document.querySelectorAll('#stageModes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === stageRun.mode));
  document.querySelectorAll('#stageCourses button').forEach((b) => b.classList.toggle('on', b.dataset.course === stageRun.course));
  document.querySelectorAll('#stageLevels button').forEach((b) => b.classList.toggle('on', b.dataset.level === stageRun.level));
  const list = $('stageCourse');
  list.innerHTML = '';
  const songs = stageSongs(stageRun.part);
  if (!songs.length) {
    const li = Object.assign(document.createElement('li'), { className: 'stage-song locked', textContent: stageRun.course === 'mine' ? 'No songs here yet: add one with Songs → ＋ New song.' : 'No songs with this part.' });
    list.append(li);
  }
  const keyed = songs.map((song) => ({ ...song, id: stageSongKey(song), entry: song }));
  courseState(stage, keyed, stageRun.part, me.id).forEach(({ song: keyedSong, crowns, unlocked: open }, i) => {
    const song = keyedSong.entry;
    const unlocked = open || stageRun.course === 'mine' || stage.unlockAll; // your own songs are always open
    const li = document.createElement('li');
    li.className = `stage-song${unlocked ? '' : ' locked'}`;
    const board = stage.scores[scoreKey(keyedSong.id, stageRun.part)] || [];
    const best = Math.max(0, ...board.filter((r) => r.player === me.id).map((r) => r.score));
    li.innerHTML = `<div class="ss-num"></div><div class="ss-title"></div><div class="ss-crowns">${crownsHtml(crowns)}</div><div class="ss-best"></div>${unlocked ? '' : '<span class="ss-lock">🔒</span>'}`;
    li.querySelector('.ss-num').textContent = `Song ${i + 1}${song.level ? ` · ${song.level}` : ''}${song.type !== 'midi' && !song.melody ? ' · chords' : ''}`;
    li.querySelector('.ss-title').textContent = song.title;
    li.querySelector('.ss-best').textContent = best ? `Best ${best.toLocaleString()}` : unlocked ? 'Not played yet' : 'Earn a 👑 on the song before to unlock';
    li.onclick = () => (unlocked ? startStage(song) : toast('Earn at least one 👑 on the song before this one to unlock it.'));
    list.append(li);
  });
}

function showStage(section) {
  stageRun.phase = section === 'play' ? stageRun.phase : section;
  $('stageMenu').hidden = section !== 'menu';
  $('stagePlay').hidden = section !== 'play';
  $('stageResults').hidden = section !== 'results';
}

/** Targets and lanes for the part being played. */
function buildStageTargets(part) {
  const channels = new Set(part.split(',').map(Number));
  const drums = channels.size === 1 && channels.has(DRUM_CHANNEL);
  const targets = [];
  for (const e of state.song.events) {
    if (e.type === 'on' && channels.has(e.ch)) targets.push({ t: e.time, note: drums ? e.note : e.note + state.transpose, ch: e.ch });
  }
  let lanes;
  let laneFor;
  let dark = new Set();
  if (drums) {
    lanes = STAGE_DRUM_LANES;
    laneFor = (n) => (LANES[laneOf(n)]?.id === 'kick' ? -1 : STAGE_DRUM_LANES.findIndex((l) => l.notes.includes(n)));
  } else {
    let lo = Math.min(...targets.map((t) => t.note));
    let hi = Math.max(...targets.map((t) => t.note));
    while (hi - lo < 7) (hi - lo) % 2 ? lo-- : hi++;
    const sf = keySf();
    lanes = [];
    for (let n = lo; n <= hi; n++) {
      const black = [1, 3, 6, 8, 10].includes(n % 12);
      if (black) dark.add(n - lo);
      lanes.push({ short: noteName(n, sf, settings.spelling).replace(/-?\d+$/, '') + (n % 12 === 0 ? Math.floor(n / 12) - 1 : ''), color: black ? '#8fb3ff' : '#4f8cff', note: n });
    }
    laneFor = (n) => (n >= lo && n <= hi ? n - lo : -2);
  }
  return { targets, drums, lanes, laneFor, dark };
}

function startStage(song) {
  synth.ensure();
  if (song) {
    loadSongEntry(song, stageRun.level);
  } else if (!state.song) {
    return toast('Open a MIDI song first (Open… or Audio → MIDI), or pick one of the songs here.');
  }
  let part = stageRun.part;
  if (!song) {
    // The song that's open: use the part picked next to the Learn button.
    part = $('learnPart').value || part;
  } else part = mapPartForSong(part);
  const channels = part.split(',').map(Number);
  if (!channels.some((c) => state.song.channels.includes(c))) return toast(`This song has no ${partName(part).toLowerCase()} part.`);
  stageRun.song = song;
  stageRun.key = song ? stageSongKey(song) : `file:${state.midiName}`;
  stageRun.playPart = part;
  if (learn.enabled) setLearn(false);
  player.pause();
  player.silent = null;
  setRate(stageRun.speed);
  stageRun.savedLoop = player.loop;
  player.loop = { ...player.loop, enabled: false };
  const built = buildStageTargets(part);
  Object.assign(stageRun, built, { pops: [], seenEvents: 0, lastCount: -1 });
  setText($('hudSong'), `${song?.title || state.song.title || state.midiName} · ${partName(stageRun.part)}${song && song.type !== 'midi' ? ` · ${LEVEL_NAMES[stageRun.level]}` : ''} · ${stageRun.mode === 'perform' ? 'Perform' : 'Practice'}${stageRun.speed < 1 ? ` · ${Math.round(stageRun.speed * 100)}%` : ''}`);
  setText($('stageHint'), built.drums ? 'Hit your e-kit, the pads, or tap the drum pads on screen.' : 'Play your keyboard, click the keys, or use the computer keys (A W S E D…).');
  buildStageTaps();
  if (stageRun.mode === 'practice') {
    $('learnPart').value = part;
    setLearn(true);
    stageRun.session = null;
  } else {
    player.silent = { isTarget: (e) => channels.includes(e.ch) };
    stageRun.session = new GameSession(built.targets, { drums: built.drums, rate: stageRun.speed });
  }
  player.seek(0);
  stageRun.phase = 'count';
  stageRun.countStart = performance.now() / 1000;
  showStage('play');
}

/** On-screen buttons for the lanes, for playing without an instrument. */
function buildStageTaps() {
  const bar = $('stageTaps');
  bar.innerHTML = '';
  const add = (label, color, down, up, cls = '') => {
    const b = Object.assign(document.createElement('button'), { textContent: label, className: cls });
    b.style.setProperty('--tc', color);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('down');
      down();
    });
    const release = () => {
      if (!b.classList.contains('down')) return;
      b.classList.remove('down');
      up?.();
    };
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    bar.append(b);
  };
  if (stageRun.drums) {
    for (const lane of STAGE_DRUM_LANES) add(lane.short, lane.color, () => liveDrum(lane.notes[0], 110));
    add('KICK', LANES.find((l) => l.id === 'kick').color, () => liveDrum(36, 115), null, 'kick');
  } else {
    stageRun.lanes.forEach((lane, i) => add(lane.short, lane.color, () => liveOn(lane.note, 100), () => liveOff(lane.note), stageRun.dark.has(i) ? 'black' : ''));
  }
}

function stopStage(toMenu = true) {
  player.pause();
  player.silent = null;
  if (stageRun.savedLoop) player.loop = stageRun.savedLoop;
  stageRun.savedLoop = null;
  if (stageRun.mode === 'practice' && learn.enabled) setLearn(false);
  stageRun.phase = 'menu';
  $('stageCount').textContent = '';
  if (toMenu) {
    showStage('menu');
    renderStageMenu();
  }
}

function stageHit(note, drum) {
  if (stageRun.phase !== 'play' || !stageRun.session || drum !== stageRun.drums) return;
  const t = player.time + (stage.calibration || 0) * stageRun.speed;
  stageRun.session.hit(note, t, performance.now() / 1000);
}

function stageTime() {
  const now = performance.now() / 1000;
  if (stageRun.phase === 'count') return (now - stageRun.countStart - stageRun.leadIn) * stageRun.speed;
  return player.time;
}

function updateStage() {
  const now = performance.now() / 1000;
  if (stageRun.phase === 'count') {
    const left = stageRun.leadIn - (now - stageRun.countStart);
    const n = Math.ceil(left);
    if (n !== stageRun.lastCount && n > 0) {
      stageRun.lastCount = n;
      synth.noteOn(GROOVE_CHANNEL, 37, 90); // count-in click
    }
    $('stageCount').textContent = left > 0 ? String(n) : '';
    if (left <= 0) {
      stageRun.phase = 'play';
      $('stageCount').textContent = '';
      player.play();
    }
  }
  const s = stageRun.session;
  const t = stageTime();
  if (s && stageRun.phase === 'play') s.update(t, now);
  // New judgements become pop-ups.
  if (s) {
    for (; stageRun.seenEvents < s.events.length; stageRun.seenEvents++) {
      const ev = s.events[stageRun.seenEvents];
      const lane = ev.target ? stageRun.laneFor(ev.target.note) : stageRun.laneFor(ev.note);
      const [text, color] = POP[ev.result];
      stageRun.pops.push({ lane: lane < 0 ? -1 : lane, text, color, born: now });
    }
    stageRun.pops = stageRun.pops.filter((p) => now - p.born < 0.6);
    setText($('hudScore'), s.score.toLocaleString());
    setText($('hudCombo'), String(s.combo));
    const m = s.multiplier;
    setText($('hudMult'), `×${m}`);
    $('hudMult').className = `hud-mult m${m}`;
    setText($('hudAcc'), `${Math.round(s.accuracy)}%`);
    const crowns = crownsFor(s.accuracy);
    if ($('hudCrowns').dataset.n !== String(crowns)) {
      $('hudCrowns').dataset.n = String(crowns);
      $('hudCrowns').innerHTML = crownsHtml(crowns);
    }
  } else {
    setText($('hudScore'), '—');
    setText($('hudCombo'), String(learn.correct));
    setText($('hudMult'), '🧘');
    $('hudMult').className = 'hud-mult';
    setText($('hudAcc'), `${Math.round((100 * learn.correct) / Math.max(1, learn.correct + learn.wrong))}%`);
    $('hudCrowns').innerHTML = '';
    $('hudCrowns').dataset.n = '';
  }
  $('hudProgress').style.width = `${Math.max(0, Math.min(100, (100 * Math.max(0, t)) / Math.max(1, player.duration)))}%`;

  // The highway.
  const ahead = 2.2 / Math.max(0.6, stageRun.speed);
  const notes = [];
  const barNotes = [];
  const targets = s ? s.targets : buildStageTargetsCache();
  for (const x of targets) {
    if (x.t < t - 0.4) continue;
    if (x.t > t + ahead) break;
    const lane = stageRun.laneFor(x.note);
    const hidden = x.result && x.result !== 'miss';
    if (lane === -1) {
      if (!hidden) barNotes.push({ t: x.t });
    } else if (lane >= 0) {
      const color = x.result === 'miss' ? '#555' : stageRun.drums ? undefined : state.chan[x.ch]?.color;
      notes.push({ t: x.t, lane, vel: 100, hidden, color });
    }
  }
  const beats = [];
  for (let b = Math.ceil(state.song.beatAt(Math.max(0, t - 0.4))); beats.length < 64; b++) {
    const bt = state.song.secAt(b);
    if (bt > t + ahead) break;
    beats.push(bt);
  }
  const want = new Set(!s && learn.enabled ? [...learn.expected].map((n) => stageRun.laneFor(n)).filter((l) => l >= 0) : []);
  drawDrumHighway($('stageCanvas'), {
    lanes: stageRun.lanes,
    dark: stageRun.dark,
    notes,
    barNotes,
    barColor: '#ff7a45',
    time: t,
    ahead,
    beats,
    want,
    pops: stageRun.pops.map((p) => ({ ...p, age: now - p.born })),
    flash: stageRun.drums ? STAGE_DRUM_LANES.map((l) => now - highwayHits[LANES.indexOf(l)]) : stageRun.lanes.map((l) => (liveNotesDown().has(l.note) ? 0 : 99)),
    fg: '#e8e9ee',
    bg: '#0b0c12',
  });
}

let stageTargetsCache = { song: null, part: '', list: [] };
function buildStageTargetsCache() {
  if (stageTargetsCache.song !== state.song || stageTargetsCache.part !== stageRun.playPart) {
    stageTargetsCache = { song: state.song, part: stageRun.playPart, list: buildStageTargets(stageRun.playPart).targets };
  }
  return stageTargetsCache.list;
}

function liveNotesDown() {
  return new Set([...liveMap.values()].map((m) => m.note));
}

function finishStage() {
  const me = stagePlayer();
  player.pause();
  player.silent = null;
  if (stageRun.savedLoop) player.loop = stageRun.savedLoop;
  stageRun.savedLoop = null;
  stageRun.phase = 'results';
  let summary;
  if (stageRun.session) {
    summary = stageRun.session.finish();
  } else {
    const acc = Math.round((1000 * learn.correct) / Math.max(1, learn.correct + learn.wrong)) / 10;
    summary = { score: 0, accuracy: acc, crowns: 0, maxCombo: 0, counts: { perfect: learn.correct, great: 0, good: 0, miss: learn.wrong, extra: 0 }, practice: true };
    setLearn(false);
  }
  setText($('resTitle'), summary.practice ? `Practice done, ${me.name}! 🧘` : summary.crowns ? `${['', 'You passed', 'Nice', 'Great job', 'Amazing', 'PERFECT'][summary.crowns]}, ${me.name}!` : `So close, ${me.name}. Try again!`);
  $('resCrowns').innerHTML = summary.practice ? '' : Array.from({ length: 5 }, (_, i) => `<span class="${i < summary.crowns ? '' : 'crown-off'}" style="animation-delay:${i * 0.12}s">👑</span>`).join('');
  setText($('resScore'), summary.practice ? '—' : summary.score.toLocaleString());
  setText($('resAcc'), `${summary.accuracy}%`);
  setText($('resCombo'), summary.practice ? '—' : String(summary.maxCombo));
  const c = summary.counts;
  $('resCounts').textContent = summary.practice
    ? `✓ ${c.perfect} right · ✗ ${c.miss} wrong`
    : `Perfect ${c.perfect} · Great ${c.great} · Good ${c.good} · Missed ${c.miss}${c.extra ? ` · Extra hits ${c.extra}` : ''}`;
  const board = $('resBoard');
  board.innerHTML = '';
  setText($('resBest'), '');
  if (!summary.practice) {
    const { rank, best } = recordScore(stage, stageRun.key, stageRun.playPart, me.id, summary);
    saveStage(stage);
    setText($('resBest'), best && rank === 1 ? '🏆 New family high score!' : best ? '⭐ New personal best!' : '');
    (stage.scores[scoreKey(stageRun.key, stageRun.playPart)] || []).slice(0, 5).forEach((r, i) => {
      const p = stage.players.find((x) => x.id === r.player);
      const li = document.createElement('li');
      if (i === rank - 1) li.className = 'me';
      li.innerHTML = '<span class="rb-rank"></span><span class="rb-name"></span><span class="rb-crowns"></span><span class="rb-score"></span>';
      li.querySelector('.rb-rank').textContent = `${i + 1}.`;
      li.querySelector('.rb-name').textContent = p ? p.name : 'Player';
      li.querySelector('.rb-name').style.color = p?.color || '';
      li.querySelector('.rb-crowns').textContent = '👑'.repeat(r.crowns);
      li.querySelector('.rb-score').textContent = r.score.toLocaleString();
      board.append(li);
    });
    if (summary.crowns) {
      // A little fanfare.
      [60, 64, 67, 72].forEach((n, i) => {
        synth.noteOn(LIVE_CHANNEL, n, 90, synth.now + 0.12 * i + 0.05);
        synth.noteOff(LIVE_CHANNEL, n, synth.now + 1.4);
      });
    }
  }
  const songs = stageSongs(stageRun.part);
  const idx = stageRun.song ? songs.findIndex((x) => x.id === stageRun.song.id) : -1;
  const next = idx >= 0 ? songs[idx + 1] : null;
  const keyed = songs.map((x) => ({ id: stageSongKey(x) }));
  const nextOpen = next && (stageRun.course === 'mine' || stage.unlockAll || courseState(stage, keyed, stageRun.part, me.id)[idx + 1].unlocked);
  $('resNext').hidden = !nextOpen;
  $('resNext').onclick = () => startStage(next);
  showStage('results');
}

function initStage() {
  const dlg = $('stageDlg');
  $('btnStage').onclick = () => {
    if (!dlg.open) dlg.show();
    if (stageRun.phase === 'menu') {
      showStage('menu');
      renderStageMenu();
    }
  };
  dlg.querySelector('[data-close]').onclick = () => {
    if (stageRun.phase === 'count' || stageRun.phase === 'play') stopStage();
    dlg.close();
  };
  makeDraggable(dlg);
  $('stageAddPlayer').onclick = () => {
    const name = prompt('New player name');
    if (!name || !name.trim()) return;
    const id = `p${Date.now()}`;
    stage.players.push({ id, name: name.trim().slice(0, 20), color: PLAYER_COLORS[stage.players.length % PLAYER_COLORS.length] });
    stage.current = id;
    saveStage(stage);
    renderStageMenu();
  };
  document.querySelectorAll('#stageParts button').forEach((b) => (b.onclick = () => {
    stageRun.part = b.dataset.part;
    renderStageMenu();
  }));
  document.querySelectorAll('#stageModes button').forEach((b) => (b.onclick = () => {
    stageRun.mode = b.dataset.mode;
    renderStageMenu();
  }));
  document.querySelectorAll('#stageCourses button').forEach((b) => (b.onclick = () => {
    stageRun.course = b.dataset.course;
    renderStageMenu();
  }));
  document.querySelectorAll('#stageLevels button').forEach((b) => (b.onclick = () => {
    stageRun.level = b.dataset.level;
    renderStageMenu();
  }));
  $('stageSpeed').onchange = () => (stageRun.speed = Number($('stageSpeed').value));
  $('stageCalib').value = String(Math.round((stage.calibration || 0) * 1000));
  $('stageCalib').onchange = () => {
    stage.calibration = Math.max(-0.2, Math.min(0.3, Number($('stageCalib').value) / 1000 || 0));
    saveStage(stage);
  };
  $('stageCurrent').onclick = () => startStage(null);
  $('stageUnlock').checked = !!stage.unlockAll;
  $('stageUnlock').onchange = () => {
    stage.unlockAll = $('stageUnlock').checked;
    saveStage(stage);
    renderStageMenu();
  };
  $('stageStop').onclick = () => stopStage();
  $('stageRestart').onclick = () => {
    stopStage(false);
    startStage(stageRun.song);
  };
  $('resRetry').onclick = () => startStage(stageRun.song);
  $('resMenu').onclick = () => {
    showStage('menu');
    stageRun.phase = 'menu';
    renderStageMenu();
  };
}

// ---- Learn mode ("wait for me") ----------------------------------------

const learn = { enabled: false, channels: new Set(), drums: false, expected: new Set(), next: [], correct: 0, wrong: 0, total: 0 };

function updateLearnParts() {
  const sel = $('learnPart');
  const prev = sel.value;
  sel.innerHTML = '';
  const song = state.song;
  if (song) {
    const melodic = song.channels.filter((ch) => ch !== DRUM_CHANNEL);
    if (state.librarySong) {
      const [rh, lh] = state.libraryChart ? ['Right hand (chords)', 'Left hand (bass)'] : ['Right hand (melody)', 'Left hand (chords)'];
      sel.append(new Option(rh, '0'), new Option(lh, '1'), new Option('Both hands', '0,1'));
    } else {
      for (const ch of melodic) sel.append(new Option(`Ch ${ch + 1}: ${channelName(ch)}`, String(ch)));
      if (melodic.length > 1) sel.append(new Option('All parts', melodic.join(',')));
    }
    if (song.channels.includes(DRUM_CHANNEL)) sel.append(new Option('Drums', String(DRUM_CHANNEL)));
  }
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  sel.disabled = !song;
  $('btnLearn').disabled = !song;
  if (learn.enabled) applyLearnPart();
}

function applyLearnPart() {
  learn.channels = new Set($('learnPart').value.split(',').filter(Boolean).map(Number));
  learn.drums = learn.channels.size === 1 && learn.channels.has(DRUM_CHANNEL);
}

function setLearn(on) {
  if (on && !state.song) return toast('Open a song first (try the Songs button).');
  if (on && state.lessonMode) return toast('Learn mode works with MIDI songs. Close the audio/video to use it.');
  const wasPlaying = player.playing || !!player.waiting;
  const at = player.time;
  learn.enabled = on;
  applyLearnPart();
  Object.assign(learn, { expected: new Set(), next: [], correct: 0, wrong: 0, total: 0 });
  player.learn = on ? { isTarget: (e) => learn.channels.has(e.ch) } : null;
  $('btnLearn').classList.toggle('on', on);
  // Restart from here so the new rules take effect right away.
  if (wasPlaying) {
    player.pause();
    player.position = at;
    player.play();
  } else {
    player.waiting = null;
  }
  if (on && learn.drums) setDrumView('highway');
  if (on) toast(learn.drums ? 'Learn drums: hit the drum in the white box on the highway (or the highlighted pad).' : 'Learn mode: play the yellow keys. The song waits for you.');
  markDirty();
}

/** A note you played: is it what the song is waiting for? */
function learnCheck(note, drum) {
  if (!learn.enabled || !player.waiting) return;
  if (drum !== learn.drums) return; // keys for melodic parts, pads/e-kit for drums
  // Drums: any note of the same drum counts (snare rim = snare, open/closed hat = hi-hat…).
  const match = [...learn.expected].find((n) => (drum ? sameDrum(n, note) : n === note));
  if (match === undefined) {
    learn.wrong++;
  } else {
    learn.expected.delete(match);
    learn.correct++;
    if (!learn.expected.size) {
      learn.next = [];
      player.resumeWait();
    }
  }
  markDirty();
}

function renderLearn(sf, spelling) {
  const el = $('learnStats');
  if (!learn.enabled) {
    setText(el, '');
    const want = lessonPadTargets();
    padEls.forEach((p, note) => p.classList.toggle('want', want.has(note)));
    return;
  }
  const want = [...learn.expected];
  const names = learn.drums
    ? want.map((n) => PADS.find(([p]) => p === (PAD_ALIAS[n] ?? n))?.[1] || `#${n}`)
    : want.sort((a, b) => a - b).map((n) => noteName(n, sf, spelling));
  const status = player.waiting ? `${!learn.drums && singingNow() ? 'Sing' : 'Play'} ${names.join(' + ')}` : player.playing ? 'Listening…' : 'Press ▶ to start';
  setText(el, `${status} · ✓${learn.correct} ✗${learn.wrong}`);
  const wantPads = new Set(learn.drums ? want.map((n) => PAD_ALIAS[n] ?? n) : []);
  padEls.forEach((p, note) => p.classList.toggle('want', wantPads.has(note)));
}

// ---- Song library (tool window) ------------------------------------------

// Songs: the built-in library plus your own (chord charts you typed, or saved MIDI files).
let mySongs = loadMySongs();
const libLevel = () => $('libLevel').value || 'beginner';

/** MIDI bytes for a song entry at an arrangement level. */
function entryMidi(entry, level = 'beginner') {
  return entry.type === 'midi' ? fromB64(entry.midi) : songToMidi(entry, { level });
}

/** For a MIDI song, the channels that count as right hand / left hand / both / drums. */
function mapPartForSong(part) {
  if (state.librarySong || part === String(DRUM_CHANNEL)) return part;
  const melodic = (state.song?.channels || []).filter((ch) => ch !== DRUM_CHANNEL);
  if (!melodic.length) return part;
  if (melodic.length >= 4) {
    // A four-part hymn file (soprano, alto, tenor, bass): play it the way hymns are played on piano.
    if (part === '0') return melodic.slice(0, 2).join(',');
    if (part === '1') return melodic.slice(2, 4).join(',');
    return melodic.slice(0, 4).join(',');
  }
  if (part === '0') return String(melodic[0]);
  if (part === '1') return String(melodic[1] ?? melodic[0]);
  return melodic.slice(0, 2).join(',');
}

function loadSongEntry(entry, level) {
  synth.ensure();
  if (state.mediaFile) ejectMedia();
  loadMidiBytes(entryMidi(entry, level), `${entry.title}.mid`);
  state.librarySong = entry.type === 'midi' ? null : entry.id;
  state.libraryChart = entry.type !== 'midi' && !entry.melody;
  state.songVerses = entry.verses || null;
  updateMixerNames();
  updateLearnParts();
}

function openLibrarySong(song, part, level = libLevel()) {
  loadSongEntry(song, level);
  if (part) {
    $('learnPart').value = mapPartForSong(part);
    setLearn(true);
  } else if (learn.enabled) setLearn(false);
  player.play();
  markDirty();
}

function songItem(song, { mine = false } = {}) {
  const li = document.createElement('li');
  const top = document.createElement('div');
  top.className = 'song-top';
  const chart = song.type !== 'midi' && !song.melody;
  const title = Object.assign(document.createElement('span'), { className: 'song-name', textContent: song.title });
  top.append(title);
  if (song.level) top.append(Object.assign(document.createElement('span'), { className: `level ${song.level.toLowerCase()}`, textContent: song.level }));
  if (chart) top.append(Object.assign(document.createElement('span'), { className: 'tag-practice', textContent: 'Chords' }));
  if (song.type !== 'midi') {
    top.append(Object.assign(document.createElement('span'), {
      className: 'meta',
      textContent: `${keyName(song.key)}${song.minor ? ' minor' : ''} · ${song.time[0]}/${song.time[1]} · ${song.bpm} bpm`,
    }));
  } else top.append(Object.assign(document.createElement('span'), { className: 'meta', textContent: 'MIDI file' }));
  if (mine) {
    const actions = Object.assign(document.createElement('span'), { className: 'actions-mine' });
    if (song.type !== 'midi') actions.append(Object.assign(document.createElement('button'), { className: 'mini', textContent: '✎ Edit', onclick: () => openBuilder(song) }));
    actions.append(Object.assign(document.createElement('button'), {
      className: 'mini',
      textContent: '🗑',
      title: 'Delete',
      onclick: () => {
        if (!confirm(`Delete "${song.title}" from My Songs?`)) return;
        mySongs = mySongs.filter((x) => x.id !== song.id);
        saveMySongs(mySongs);
        renderSongLists();
      },
    }));
    top.append(actions);
  }
  li.append(top);
  if (song.about) li.append(Object.assign(document.createElement('p'), { className: 'about', textContent: song.about }));
  const row = document.createElement('div');
  row.className = 'row wrap';
  const button = (label, fn, titleText) => {
    const b = Object.assign(document.createElement('button'), { textContent: label, title: titleText || '' });
    b.onclick = fn;
    row.append(b);
  };
  button('▶ Listen', () => openLibrarySong(song), 'Hear the whole song');
  button(chart ? '🎯 Right hand (chords)' : '🎯 Right hand', () => openLibrarySong(song, '0'), chart ? 'Learn the chords' : 'Learn the melody');
  button(chart ? '🎯 Left hand (bass)' : '🎯 Left hand', () => openLibrarySong(song, '1'), chart ? 'Learn the bass line' : 'Learn the chords');
  button('🎯 Both hands', () => openLibrarySong(song, '0,1'));
  if (song.drums || song.type === 'midi') button('🥁 Drums', () => openLibrarySong(song, String(DRUM_CHANNEL)), 'Learn the drum part on the pads or your e-kit');
  li.append(row);
  return li;
}

function renderSongLists() {
  for (const [id, cat] of [['songListChurch', 'church'], ['songList', 'starter']]) {
    const list = $(id);
    list.innerHTML = '';
    for (const song of songsIn(cat)) list.append(songItem(song));
  }
  const mine = $('songListMine');
  mine.innerHTML = '';
  for (const song of mySongs) mine.append(songItem(song, { mine: true }));
  $('mySongsEmpty').hidden = mySongs.length > 0;
  if ($('stageDlg').open && stageRun.phase === 'menu') renderStageMenu();
}

// ---- Song Builder --------------------------------------------------------

const KEYS = [['C', 0], ['G', 1], ['D', 2], ['A', 3], ['E', 4], ['B', 5], ['F#', 6], ['Db', -5], ['Ab', -4], ['Eb', -3], ['Bb', -2], ['F', -1]];
const MINOR_KEYS = [['Am', 0], ['Em', 1], ['Bm', 2], ['F#m', 3], ['C#m', 4], ['G#m', 5], ['Ebm', -6], ['Bbm', -5], ['Fm', -4], ['Cm', -3], ['Gm', -2], ['Dm', -1]];
const TEMPLATES = {
  worship: { key: '1', time: '4/4', bpm: 72, drums: 'straight', chords: 'Verse:\n| G | D/F# | Em | C |\n| G | D/F# | Em | C |\nChorus:\n| C | G | D | Em |\n| C | G | Dsus4 D | G |' },
  gospel: { key: '0', time: '4/4', bpm: 84, drums: 'shuffle', chords: 'Vamp:\n| Dm7 | G7 | Cmaj7 | A7 | x2\nTurnaround:\n| Fmaj7 | Fm6 | Em7 A7 | Dm7 G7 |' },
  hymn: { key: '-1', time: '4/4', bpm: 80, drums: 'straight', chords: '| F | Bb F | C | F |\n| F | Bb F | C7 | F |' },
  ballad: { key: '2', time: '6/8', bpm: 60, drums: 'ballad68', chords: '| D | G/D | Bm | A |\n| G | A | D | D |' },
  praise: { key: '-4', time: '4/4', bpm: 128, drums: 'twostep', chords: 'Praise break:\n| Ab | Db/Ab | Ab | Eb7 | x2\n| Db | Ebsus4 Eb | Ab | Ab |' },
};
let builderEditing = null;

function builderSong() {
  const [num, den] = $('bTime').value.split('/').map(Number);
  const beatsPerBar = (num * 4) / den;
  const keyVal = $('bKey').value; // "sf" or "m:sf"
  const minor = keyVal.startsWith('m:');
  const conv = chartToChords($('bChords').value, beatsPerBar);
  const song = {
    id: builderEditing?.id || `my-${Date.now().toString(36)}`,
    type: 'chart',
    title: $('bTitle').value.trim(),
    key: Number(minor ? keyVal.slice(2) : keyVal),
    minor,
    time: [num, den],
    bpm: Math.round(Number($('bBpm').value) || 0),
    drums: $('bDrums').value || null,
    level: $('bLevel').value,
    about: $('bAbout').value.trim(),
    chart: $('bChords').value,
    chords: conv.chords,
    melody: $('bMelody').value.trim(),
    lyrics: $('bLyrics').value.trim(),
    lyricBars: Number($('bLyricBars').value) || 2,
  };
  return { song, conv };
}

function updateBuilderStatus() {
  const { song, conv } = builderSong();
  const errors = [...conv.errors, ...validateSong(song).filter((e) => !/title/i.test(e) || $('bTitle').value)];
  const el = $('bStatus');
  if (errors.length) {
    el.className = 'builder-status err';
    el.textContent = `⚠ ${errors.slice(0, 3).join(' · ')}`;
  } else {
    el.className = 'builder-status ok';
    const secs = (conv.bars * song.time[0] * 4 / song.time[1] * 60) / Math.max(30, song.bpm);
    el.textContent = `✓ ${conv.bars} bars · about ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}${song.melody ? ' · with melody' : ' · right hand plays the chords'}`;
  }
  return errors;
}

function openBuilder(song = null) {
  builderEditing = song;
  $('builderTitle').textContent = song ? `Edit: ${song.title}` : 'Song Builder';
  $('bTitle').value = song?.title || '';
  $('bKey').value = song ? (song.minor ? `m:${song.key}` : String(song.key)) : '0';
  $('bTime').value = song ? `${song.time[0]}/${song.time[1]}` : '4/4';
  $('bBpm').value = song?.bpm || 80;
  $('bDrums').value = song?.drums || (song ? '' : 'straight');
  $('bLevel').value = song?.level || 'Intermediate';
  $('bChords').value = song?.chart ?? '';
  $('bMelody').value = song?.melody || '';
  $('bLyrics').value = song?.lyrics || '';
  $('bLyricBars').value = String(song?.lyricBars || 2);
  $('bAbout').value = song?.about || '';
  $('bTemplate').value = '';
  $('bDelete').hidden = !song;
  updateBuilderStatus();
  const dlg = $('builderDlg');
  if (!dlg.open) dlg.show();
  $('bTitle').focus();
}

function initBuilder() {
  const dlg = $('builderDlg');
  makeDraggable(dlg);
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  for (const [name, sf] of KEYS) $('bKey').append(new Option(`${name} major`, String(sf)));
  for (const [name, sf] of MINOR_KEYS) $('bKey').append(new Option(`${name} (minor)`, `m:${sf}`));
  for (const [id, name] of Object.entries(DRUM_STYLE_NAMES)) $('bDrums').append(new Option(name, id));
  for (const id of ['bTitle', 'bChords', 'bMelody', 'bLyrics', 'bBpm', 'bTime', 'bKey']) $(id).addEventListener('input', updateBuilderStatus);
  $('bTime').onchange = () => {
    const t = $('bTime').value;
    if (t === '6/8' && !['ballad68', ''].includes($('bDrums').value)) $('bDrums').value = 'ballad68';
    if (t === '3/4' && !['waltz', ''].includes($('bDrums').value)) $('bDrums').value = 'waltz';
    if (t === '12/8' && $('bDrums').value === 'straight') $('bDrums').value = 'shuffle';
    updateBuilderStatus();
  };
  $('bTemplate').onchange = () => {
    const t = TEMPLATES[$('bTemplate').value];
    if (!t) return;
    if ($('bChords').value.trim() && !confirm('Replace the chords you typed with this template?')) {
      $('bTemplate').value = '';
      return;
    }
    $('bKey').value = t.key;
    $('bTime').value = t.time;
    $('bBpm').value = t.bpm;
    $('bDrums').value = t.drums;
    $('bChords').value = t.chords;
    updateBuilderStatus();
  };
  $('bPreview').onclick = () => {
    const errors = updateBuilderStatus().filter((e) => !/title/i.test(e));
    if (errors.length) return toast(errors[0]);
    const { song } = builderSong();
    openLibrarySong({ ...song, title: song.title || 'New song' });
  };
  $('bSave').onclick = () => {
    const errors = updateBuilderStatus();
    if (errors.length) return toast(errors[0]);
    const { song } = builderSong();
    const i = mySongs.findIndex((x) => x.id === song.id);
    if (i >= 0) mySongs[i] = song;
    else mySongs.push(song);
    if (!saveMySongs(mySongs)) return toast('Could not save (browser storage is full or blocked).');
    builderEditing = song;
    $('bDelete').hidden = false;
    renderSongLists();
    toast(`Saved "${song.title}" to My Songs. Find it in Songs and in 🎸 Stage → My Songs.`);
  };
  $('bDelete').onclick = () => {
    if (!builderEditing || !confirm(`Delete "${builderEditing.title}"?`)) return;
    mySongs = mySongs.filter((x) => x.id !== builderEditing.id);
    saveMySongs(mySongs);
    renderSongLists();
    dlg.close();
  };
}

function initSongs() {
  renderSongLists();
  $('libLevel').onchange = () => toast(`${LEVEL_NAMES[libLevel()]} arrangement: pick a song to hear it.`);
  $('libNew').onclick = () => openBuilder();
  $('libSaveOpen').onclick = () => {
    if (!state.midiBytes || state.librarySong) return toast('Open a MIDI file first (Open…, or Audio → MIDI → Open MIDI only). Built-in songs are already in the library.');
    const title = prompt('Name for this song', (state.song?.title || state.midiName || 'My song').replace(/\.midi?$/i, ''));
    if (!title) return;
    let bytes = state.midiBytes;
    const melodic = state.song.channels.filter((ch) => ch !== DRUM_CHANNEL);
    if (melodic.length === 1 && confirm('This file has both hands on one track. Split it at middle C into right hand and left hand for Learn and Stage?')) {
      bytes = splitHands(state.song, 60);
    }
    mySongs.push({ id: `my-${Date.now().toString(36)}`, type: 'midi', title: title.trim().slice(0, 80), midi: toB64(bytes) });
    if (!saveMySongs(mySongs)) {
      mySongs.pop();
      return toast('That file is too big to keep in the browser.');
    }
    renderSongLists();
    toast(`Saved "${title}" to My Songs.`);
  };
  initBuilder();
  $('btnSongs').onclick = () => $('songsDlg').open || $('songsDlg').show();
  $('songsDlg').querySelector('[data-close]').onclick = () => $('songsDlg').close();
  makeDraggable($('songsDlg'));

  $('btnLearn').onclick = () => setLearn(!learn.enabled);
  $('learnPart').onchange = () => {
    if (learn.enabled) setLearn(true);
  };
  updateLearnParts();
}

/** Floating tool windows move by their title bar. */
// ---- Your church (church platform) ---------------------------------------------------
//
// Opened from a church's page (church/?c=<id>) as knight-keys/?church=<id>#lessons=piano:
// the app shows the church's name, new services start with its name, colors, logo
// and giving link, and the link opens the right place (lessons, band, church, ask,
// puppet). The church platform isn't in the plug-in, so this loads only when asked.

let appChurch = null; // the Virtual Church "church" block for this church

async function loadAppChurch() {
  const id = new URLSearchParams(location.search).get('church');
  if (!id) return;
  try {
    const P = await import('../../church/js/profile.js');
    let raw;
    if (id === 'local') raw = JSON.parse(localStorage.getItem('kc.local') || 'null');
    else {
      const r = await fetch(`../church/churches/${P.slugify(id)}.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(String(r.status));
      raw = await r.json();
    }
    if (P.validateChurch(raw).length) throw new Error('not a church file');
    const c = P.normalizeChurch(raw);
    appChurch = P.serviceBrand(c);
    document.title = `${c.name} · Knight Keys`;
    const home = Object.assign(document.createElement('a'), { className: 'church-badge', href: `../church/?c=${encodeURIComponent(id === 'local' ? 'local' : c.id)}`, textContent: `⛪ ${c.name}`, title: `Back to ${c.name}` });
    home.style.setProperty('--church', c.color);
    document.querySelector('.topbar .brand').append(home);
    if (church.svc && !church.list.length) Object.assign(church.svc.church, appChurch);
  } catch (err) {
    console.warn('Church not loaded', err);
  }
}

/** Open the place a link points at: #home, #home=<instrument>, #lessons, #lessons=<course>, #band, #church, #ask, #puppet, #lyrics, #vocal. */
function openFromHash() {
  const [where, arg] = decodeURIComponent(location.hash.slice(1)).split('=');
  if (!where) return;
  if (where === 'home') openHome(INSTRUMENTS.some((i) => i.id === arg) ? arg : undefined);
  else if (where === 'lessons') {
    if (arg && COURSES.some((c) => c.id === arg)) lessonCourse = arg;
    $('btnLessons').click();
    renderLessonMap();
  } else if (where === 'band') openBand();
  else if (where === 'church') openChurch();
  else if (where === 'ask') openAsk();
  else if (where === 'puppet') openPuppet();
  else if (where === 'lyrics') openLyrics();
  else if (where === 'vocal') openBooth();
}

// The tool window you open or click comes to the front.
function windowToFront(dlg) {
  for (const d of document.querySelectorAll('dialog.tool-window.front')) d.classList.remove('front');
  dlg.classList.add('front');
}
for (const dlg of document.querySelectorAll('dialog.tool-window')) {
  dlg.addEventListener('pointerdown', () => windowToFront(dlg), true);
  new MutationObserver(() => dlg.open && windowToFront(dlg)).observe(dlg, { attributes: true, attributeFilter: ['open'] });
}

function makeDraggable(dlg) {
  const head = dlg.querySelector('.tool-head');
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const r = dlg.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId);
    const move = (ev) => {
      dlg.style.left = `${Math.max(0, Math.min(innerWidth - 120, ev.clientX - dx))}px`;
      dlg.style.top = `${Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy))}px`;
    };
    const up = () => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', up);
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up);
  });
}

// ---- Audio → MIDI converter (tool window) --------------------------------

const cv = { file: null, buffer: null, analysis: null, notes: [], bytes: null, transcribe: null, loading: null };

function cvOptions() {
  const preset = cv.transcribe.TRANSCRIBE_PRESETS[$('cvPreset').value];
  // Sensitivity 0–100 around the preset: higher lowers the thresholds.
  const shift = (50 - Number($('cvSens').value)) / 100;
  const clamp = (v) => Math.max(0.05, Math.min(0.9, v));
  return {
    lo: preset.lo,
    hi: preset.hi,
    onset: clamp(preset.onset + shift * 0.5),
    frame: clamp(preset.frame + shift * 0.4),
    minMs: Math.max(20, Number($('cvMinMs').value) || preset.minMs),
  };
}

function cvDraw() {
  drawPianoRoll($('cvRoll'), cv.notes, cv.analysis?.duration || 1, {
    bg: '#101217',
    fg: '#cfd3dc',
    note: settings.inputColor,
    empty: cv.analysis ? 'No notes found. Try raising the sensitivity.' : 'Choose a recording, then convert.',
  });
}

function cvSetSource(file, label) {
  cv.file = file;
  cv.buffer = null;
  cv.analysis = null;
  cv.notes = [];
  cv.bytes = null;
  $('cvSource').textContent = label || file.name;
  $('cvRun').disabled = false;
  ['cvOpen', 'cvOpenMidi', 'cvDownload'].forEach((id) => ($(id).disabled = true));
  setText($('cvStatus'), '');
  cvDraw();
}

function cvRederive() {
  if (!cv.analysis) return;
  cv.notes = cv.transcribe.notesFrom(cv.analysis, cvOptions());
  cv.bytes = writeMidi(cv.transcribe.notesToMidiEvents(cv.notes), { name: `${cv.file.name} (transcribed)` });
  setText($('cvStatus'), `${cv.notes.length} notes from ${fmt(cv.analysis.duration)} of audio.`);
  ['cvOpen', 'cvOpenMidi', 'cvDownload'].forEach((id) => ($(id).disabled = !cv.notes.length));
  cvDraw();
}

/** Load the transcriber code once; every converter action waits on this. */
async function loadTranscriber() {
  if (!cv.transcribe) {
    cv.loading ??= import('./transcribe.js');
    cv.transcribe = await cv.loading;
    const sel = $('cvPreset');
    if (!sel.options.length) {
      for (const [key, p] of Object.entries(cv.transcribe.TRANSCRIBE_PRESETS)) sel.append(new Option(p.label, key));
      $('cvMinMs').value = cv.transcribe.TRANSCRIBE_PRESETS.piano.minMs;
    }
  }
  return cv.transcribe;
}

async function cvRun() {
  if (!cv.file) return;
  await loadTranscriber();
  $('cvRun').disabled = true;
  $('cvProg').hidden = false;
  $('cvProg').value = 0;
  try {
    if (!cv.buffer) {
      setText($('cvStatus'), 'Decoding audio…');
      cv.buffer = await synth.ensure().decodeAudioData(await cv.file.arrayBuffer());
    }
    setText($('cvStatus'), 'Loading the transcription model…');
    const started = performance.now();
    cv.analysis = await cv.transcribe.analyze(cv.buffer, (p) => {
      $('cvProg').value = p;
      setText($('cvStatus'), `Listening… ${Math.round(p * 100)}%`);
    });
    cvRederive();
    setText($('cvStatus'), `${$('cvStatus').textContent} Took ${((performance.now() - started) / 1000).toFixed(1)} s.`);
  } catch (err) {
    console.error(err);
    setText($('cvStatus'), `Couldn't convert: ${err.message || err}. Try a WAV or MP3.`);
  } finally {
    $('cvRun').disabled = false;
    $('cvProg').hidden = true;
  }
}

async function openConverter() {
  const dlg = $('convertDlg');
  if (!dlg.open) dlg.show();
  await loadTranscriber();
  $('cvUseMedia').disabled = !state.mediaFile;
  cvDraw();
}

function initConverter() {
  const dlg = $('convertDlg');
  $('btnConvert').onclick = openConverter;
  $('cvClose').onclick = () => dlg.close();
  $('cvPick').onclick = () => $('cvFile').click();
  $('cvFile').addEventListener('change', (e) => {
    if (e.target.files[0]) cvSetSource(e.target.files[0]);
    e.target.value = '';
  });
  $('cvUseMedia').onclick = () => state.mediaFile && cvSetSource(state.mediaFile, `${state.mediaFile.name} (loaded)`);
  $('cvRun').onclick = cvRun;
  $('cvPreset').onchange = () => {
    $('cvMinMs').value = cv.transcribe.TRANSCRIBE_PRESETS[$('cvPreset').value].minMs;
    cvRederive();
  };
  $('cvSens').addEventListener('input', cvRederive);
  $('cvMinMs').addEventListener('change', cvRederive);
  $('cvDownload').onclick = () => download(cv.bytes, cv.file.name.replace(/\.[^.]+$/, '') + '.mid', 'audio/midi');
  $('cvOpenMidi').onclick = () => loadMidiBytes(cv.bytes, cv.file.name.replace(/\.[^.]+$/, '') + ' (transcribed).mid');
  $('cvOpen').onclick = () => {
    if (state.mediaFile !== cv.file) loadMedia(cv.file);
    loadMidiBytes(cv.bytes, cv.file.name.replace(/\.[^.]+$/, '') + ' (transcribed).mid');
    toast('Lesson ready: press play and the keys follow the recording.');
  };

  makeDraggable(dlg);
}

// ---- Rendering -----------------------------------------------------------

const chordEls = {
  name: $('chordName'),
  inv: $('chordInversion'),
  notes: $('chordNotes'),
  sol: $('chordSolfege'),
  hist: $('chordHistory'),
};
const chordHistory = [];
let pendingChord = { name: '', since: 0 };
const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

function panelVar(id, name, fallback) {
  const p = panels.find((x) => x.dataset.panel === id);
  return (p && getComputedStyle(p).getPropertyValue(name).trim()) || fallback;
}

function render() {
  const sf = keySf();
  const spelling = settings.spelling;

  // Keyboard
  const [lo, hi] = KB_RANGES[settings.kbRange] || KB_RANGES[88];
  const shift = settings.kbShift * 12;
  keyboard.setRange(Math.max(0, lo + shift), Math.min(127, hi + shift));
  keyboard.style = settings.kbStyle;
  keyboard.cMarkers = settings.cMarkers;
  keyboard.labels = settings.kbLabels;
  keyboard.label = (n) => (settings.kbLabels === 'solfege' ? solfege(n, sf, solfegeMode()) : pcName(n % 12, sf, spelling));
  keyboard.split = settings.split.enabled ? settings.split : null;
  keyboard.keyState = keyState;
  if (!layout.keyboard?.hidden) keyboard.draw({ bed: panelVar('keyboard', '--panel-bg', '#111') });

  // Staff + chord
  const notes = soundingNotes();
  // In learn mode the score also shows the notes you need to play.
  const staffNotes = [...notes];
  if (learn.enabled && !learn.drums) {
    for (const n of learn.expected) if (!staffNotes.some((x) => x.midi === n)) staffNotes.push({ midi: n, color: LEARN_COLOR });
  }
  if (!layout.score?.hidden) {
    drawStaff($('staffCanvas'), staffNotes, {
      sf,
      spelling,
      splitPoint: settings.split.enabled ? settings.split.point : 60,
      fg: panelVar('score', '--panel-fg', '#ddd'),
    });
  }

  const midis = notes.map((n) => n.midi);
  const chord = detectChord(midis, sf, spelling);
  setText(chordEls.name, chord ? chord.name : midis.length ? '?' : '—');
  let sub = '';
  if (chord) sub = chord.kind === 'interval' ? `${chord.inversion} (${chord.interval})` : chord.inversion;
  else if (midis.length) sub = 'not a named chord';
  if (!midis.length) sub = `${keyName(sf, keyMinor())}`;
  setText(chordEls.inv, sub);
  setText(chordEls.notes, midis.map((n) => noteName(n, sf, spelling)).join('  '));
  setText(chordEls.sol, settings.solfege === 'off' ? '' : midis.map((n) => solfege(n, sf, settings.solfege)).join('  '));
  const stableName = chord && chord.kind === 'chord' ? chord.name : '';
  if (stableName !== pendingChord.name) pendingChord = { name: stableName, since: performance.now() };

  // Wheels & pedals
  if (!layout.controls?.hidden) {
    const vis = visibleChannels();
    drawControllers(
      $('ctrlCanvas'),
      {
        bend: liveCtl.bend || lastWheel.bend,
        mod: liveCtl.mod || lastWheel.mod,
        sustain: liveCtl.sustain || vis.some((ch) => playCtl[ch].sustain),
        sostenuto: liveCtl.sostenuto || vis.some((ch) => playCtl[ch].sostenuto),
        soft: liveCtl.soft || vis.some((ch) => playCtl[ch].soft),
      },
      { wheels: settings.showWheels, pedals: settings.showPedals },
      settings.inputColor,
      panelVar('controls', '--panel-fg', '#ccc'),
    );
  }
  if (!layout.drums?.hidden) renderGroove();
  updateMeters();
  renderLearn(sf, spelling);
}

function updateChordHistory() {
  const p = pendingChord;
  if (!p.name || performance.now() - p.since < 250) return;
  if (chordHistory[chordHistory.length - 1] === p.name) return;
  chordHistory.push(p.name);
  if (chordHistory.length > 8) chordHistory.shift();
  chordEls.hist.innerHTML = '';
  for (const name of chordHistory) {
    const s = document.createElement('span');
    s.textContent = name;
    chordEls.hist.append(s);
  }
}

let lastTimeText = '';
function updateTransport() {
  const dur = tDuration();
  const t = tTime();
  if (!scrubbing) {
    const text = fmt(t);
    if (text !== lastTimeText) {
      $('timeNow').textContent = text;
      lastTimeText = text;
    }
    $('scrub').value = dur ? Math.round((t / dur) * 1000) : 0;
  }
  setText($('timeTotal'), fmt(dur));
  setText($('btnPlay'), isPlaying() ? '❚❚' : '▶');
}

// ---- Logic tempo sync (plug-in) --------------------------------------------
//
// With "Follow Logic" on, pressing Play in Logic plays the loaded song (song beat 1
// = Logic's bar 1) and the groove at Logic's tempo; Stop, locate and cycle follow.

const HOST_LOOKAHEAD = 0.12;
const hostClock = new HostTransport(() => synth.now);
const hostFollow = { epoch: -1, song: null, grooveTo: null, grooveEpoch: -1 };
const BEAT_CLOCK = { beatAt: (b) => b, secAt: (b) => b }; // groove spans in quarter notes
const hostSync = () => IN_HOST && !!settings.followHost && hostClock.known;

function followHost() {
  const tr = hostClock;
  const now = synth.now;
  const song = state.song;
  if (hostSync() && tr.playing && song && !state.lessonMode) {
    let jump = tr.epoch !== hostFollow.epoch || hostFollow.song !== song;
    if (!player.follow) {
      player.pause();
      player.setFollow(true);
      jump = true;
    }
    if (!state.hostDriven) {
      state.hostDriven = true;
      markDirty();
    }
    hostFollow.epoch = tr.epoch;
    hostFollow.song = song;
    const bpm0 = song.bpmAt(0);
    const secAt = (ppq) => (ppq <= 0 ? (ppq * 60) / bpm0 : song.secAt(ppq));
    const beatAt = (sec) => (sec <= 0 ? (sec * bpm0) / 60 : song.beatAt(sec));
    player.syncTo(secAt(tr.ppqAt(now)), true, {
      ahead: secAt(tr.ppqAt(now + HOST_LOOKAHEAD)),
      ctxAt: (sec) => tr.timeAt(beatAt(sec)),
      jump,
    });
  } else if (state.hostDriven) {
    state.hostDriven = false;
    if (player.follow && !state.lessonMode) {
      player.syncTo(player.position, false);
      player.setFollow(false);
    }
    markDirty();
  }

  // No song: the groove alone plays on Logic's beat (bar 1 of the groove = Logic's bar 1).
  if (hostSync() && !song && groove.playing && groove.locked && tr.playing) {
    if (hostFollow.grooveTo === null || hostFollow.grooveEpoch !== tr.epoch) {
      if (hostFollow.grooveTo !== null) cancelGrooveFrom(now);
      hostFollow.grooveTo = tr.ppqAt(now);
      hostFollow.grooveEpoch = tr.epoch;
    }
    const to = tr.ppqAt(now + HOST_LOOKAHEAD);
    if (to > hostFollow.grooveTo) {
      groove.scheduleSpan(hostFollow.grooveTo, to, (b) => tr.timeAt(b), BEAT_CLOCK);
      hostFollow.grooveTo = to;
    }
  } else if (hostFollow.grooveTo !== null) {
    hostFollow.grooveTo = null;
    if (!state.song) cancelGrooveFrom(now);
  }
}

function cancelGrooveFrom(at) {
  synth.cancelOneShots(at, GROOVE_CHANNEL);
  visualQueue = visualQueue.filter((e) => e.t < at || !e.groove);
}

if (IN_HOST) {
  onHostTransport((pos) => {
    const first = !hostClock.known;
    hostClock.update(pos);
    if (first) updateGrooveLock();
    followHost();
  });
  setInterval(followHost, 25);
}

function frame() {
  const now = synth.now;
  while (visualQueue.length && visualQueue[0].t <= now) visualQueue.shift().fn();

  if (state.lessonMode && state.mediaReady) {
    player.syncTo(media.currentTime + Number(settings.lessonOffset || 0), !media.paused);
  }
  // A/B looping for media (MIDI loops are sample-accurate inside the player).
  if (hasMedia() && state.loop.enabled && !media.paused && state.loop.b > state.loop.a && media.currentTime >= state.loop.b) {
    media.currentTime = state.loop.a;
  }

  updateTransport();
  if (settings.drumView === 'highway' && !layout.drums?.hidden) renderHighway();
  if ((stageRun.phase === 'count' || stageRun.phase === 'play') && $('stageDlg').open && state.song) updateStage();
  if (dirty) {
    dirty = false;
    render();
  }
  updateChordHistory();
  requestAnimationFrame(frame);
}

// ---- Home (one screen per instrument) --------------------------------------
//
// Like Yousician / Simply Piano: pick your instrument and see your next lesson,
// your path, the songs you unlock and your practice tools. See home.js.

const TOOLS = {
  songs: ['🎵 Songs', 'Free songs to learn', () => $('btnSongs').click()],
  score: ['📜 Sheet music', 'The full score of the open song', () => $('btnScore').click()],
  learn: ['🎯 Learn mode', 'The song waits until you play the right notes', () => $('btnLearn').click()],
  grooves: ['🥁 Grooves', 'Play along with drum beats', () => document.querySelector('[data-layout="drums"]')?.click()],
  kit: ['🎛 Kit Rack', 'Choose and tune your drum kit', () => $('btnKit').click()],
  booth: ['🎙 Vocal Booth', 'Live pitch graph and tuner for singers', () => openBooth()],
  lyrics: ['🎤 Lyrics', 'Sing along: the words light up', () => openLyrics()],
  mic: ['🎤 Microphone', 'Turn listening on or off', () => (micSupported() ? toggleMic() : toast('The microphone works in the Knight Lyfe Ultimate app and on the website.'))],
  tuner: ['🎚 Tuner', 'Tune your strings', (inst) => {
    const lesson = tunerLesson(inst.id);
    if (lesson) openLessonFromHome(lesson, instrumentById(inst.id).courses[0]);
  }],
};

const homeSongKeyed = (part) => stageSongs(part).map((song) => ({ ...song, id: stageSongKey(song), entry: song }));

function openHome(instrumentId) {
  if (instrumentId) settings.homeInstrument = instrumentId;
  const dlg = $('homeDlg');
  if (!dlg.open) dlg.show();
  renderHome();
}

function openLessonFromHome(lesson, course) {
  $('homeDlg').close(); // Home steps aside; 🏠 brings it back with your progress
  lessonCourse = course;
  $('btnLessons').click();
  if (lesson) startLesson(lesson);
  else renderLessonMap();
}

function playStageFromHome(entry) {
  $('homeDlg').close();
  stageRun.part = entry.part;
  $('btnStage').click();
  if (stageRun.phase === 'menu') startStage(entry.song.entry);
}

function renderHome() {
  const me = stagePlayer();
  const sel = $('homePlayer');
  sel.innerHTML = '';
  for (const p of stage.players) sel.append(new Option(p.name, p.id));
  sel.value = stage.current;
  const streak = currentStreak(stage.practice?.[stage.current], todayStr());
  setText($('homeStreak'), streak ? `🔥 ${streak}-day streak` : '');
  $('homeAtStart').checked = settings.homeAtStart !== false;

  const opts = { progress: lessonProgress(), stage, playerId: me.id, stageSongs: homeSongKeyed, unlockAll: !!stage.unlockAll };
  const current = instrumentById(settings.homeInstrument).id;

  // Instrument tabs, each with its progress.
  const tabs = $('homeTabs');
  tabs.innerHTML = '';
  for (const inst of INSTRUMENTS) {
    const h = instrumentHome(inst.id, opts);
    const b = Object.assign(document.createElement('button'), { className: `home-tab${inst.id === current ? ' on' : ''}` });
    b.innerHTML = '<span class="ht-icon"></span><span class="ht-name"></span><span class="ht-meta"></span>';
    b.querySelector('.ht-icon').textContent = inst.icon;
    b.querySelector('.ht-name').textContent = inst.name;
    b.querySelector('.ht-meta').textContent = `${h.lessons.done}/${h.lessons.total} lessons`;
    b.setAttribute('aria-pressed', String(inst.id === current));
    b.onclick = () => {
      settings.homeInstrument = inst.id;
      saveSettings();
      renderHome();
    };
    tabs.append(b);
  }

  const home = instrumentHome(current, opts);
  const { instrument: inst, lessons } = home;

  // Hero: progress and the next lesson.
  const hero = $('homeHero');
  hero.innerHTML = `<div class="hh-icon"></div>
    <div><div class="hh-name"></div><div class="hh-rank"></div><progress max="1"></progress></div>
    <div class="hh-next"><span class="small"></span><button class="primary"></button></div>
    <p class="hh-plays"></p>`;
  hero.querySelector('.hh-icon').textContent = inst.icon;
  hero.querySelector('.hh-name').textContent = inst.name;
  hero.querySelector('.hh-rank').textContent = `${lessons.rank} · ${lessons.done} of ${lessons.total} lessons · ★ ${lessons.stars}/${lessons.maxStars}`;
  hero.querySelector('progress').value = lessons.share;
  const go = hero.querySelector('.hh-next button');
  if (home.next) {
    setText(hero.querySelector('.hh-next span'), lessons.done ? 'Up next' : 'Start here');
    go.textContent = `${lessons.done ? 'Continue' : 'Start'}: ${home.next.lesson.title} ▶`;
    go.onclick = () => openLessonFromHome(home.next.lesson, home.next.course);
  } else {
    setText(hero.querySelector('.hh-next span'), lessons.total ? 'Every lesson passed 🎉' : '');
    go.textContent = 'All lessons';
    go.onclick = () => openLessonFromHome(null, inst.courses[0]);
  }
  hero.querySelector('.hh-plays').textContent = `Plays with: ${inst.plays}`;

  // The path: units with progress.
  const units = $('homeUnits');
  units.innerHTML = '';
  for (const u of home.units) {
    const b = Object.assign(document.createElement('button'), { className: `home-unit${u.unlocked ? '' : ' locked'}` });
    b.innerHTML = '<div class="hu-title"></div><div class="hu-meta"></div><progress></progress>';
    b.querySelector('.hu-title').textContent = `${u.unit.icon || ''} ${u.unit.title}`.trim();
    b.querySelector('.hu-meta').textContent = u.unlocked ? `${u.done}/${u.total} lessons · ★ ${u.stars}` : '🔒 Pass the lessons before it';
    Object.assign(b.querySelector('progress'), { max: u.total || 1, value: u.done });
    b.onclick = () => {
      if (!u.unlocked) return toast('Pass the lessons before this unit to open it.');
      const first = u.unit.lessons.find((l) => !lessonProgress()[l.id]) || u.unit.lessons[0];
      openLessonFromHome(first, u.course);
    };
    units.append(b);
  }

  // Songs: the next ones to play, then what's coming.
  const songs = $('homeSongs');
  songs.innerHTML = '';
  setText($('homeSongsNote'), inst.stageParts.length ? `(Stage · ${stageRun.course === 'church' ? 'Church & Worship' : stageRun.course === 'starter' ? 'Starter' : 'My Songs'}: earn a 👑 to open the next)` : '(pass a song lesson to open the next)');
  const list = songsToShow(home.songs, 8);
  if (!list.length) songs.append(Object.assign(document.createElement('p'), { className: 'small', textContent: 'No songs yet for this instrument.' }));
  for (const entry of list) {
    const b = Object.assign(document.createElement('button'), { className: `home-song${entry.unlocked ? '' : ' locked'}` });
    b.innerHTML = '<span class="hs-badge"></span><div class="hs-title"></div><div class="hs-meta"></div>';
    b.querySelector('.hs-title').textContent = entry.title;
    if (entry.kind === 'stage') {
      b.querySelector('.hs-badge').textContent = entry.unlocked ? '👑'.repeat(entry.crowns) || '▶' : '🔒';
      b.querySelector('.hs-meta').textContent = `Stage · ${entry.partName}${entry.song.level ? ` · ${entry.song.level}` : ''}`;
      b.onclick = () => (entry.unlocked ? playStageFromHome(entry) : toast('Earn at least one 👑 on the song before this one to unlock it.'));
    } else {
      b.querySelector('.hs-badge').textContent = entry.unlocked ? (entry.stars ? '★'.repeat(entry.stars) : '▶') : '🔒';
      b.querySelector('.hs-meta').textContent = 'Song lesson';
      b.onclick = () => (entry.unlocked ? openLessonFromHome(entry.lesson, entry.course) : toast('Pass the lesson before it to open this song.'));
    }
    songs.append(b);
  }

  // Tools.
  const tools = $('homeTools');
  tools.innerHTML = '';
  for (const id of inst.tools) {
    const [label, title, run] = TOOLS[id];
    if (id === 'tuner' && !tunerLesson(inst.id)) continue;
    const b = Object.assign(document.createElement('button'), { textContent: label, title });
    b.onclick = () => run(inst);
    tools.append(b);
  }
}

function initHome() {
  const dlg = $('homeDlg');
  $('btnHome').onclick = () => openHome();
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  makeDraggable(dlg);
  $('homePlayer').onchange = (e) => {
    stage.current = e.target.value;
    saveStage(stage);
    renderHome();
  };
  $('homeAtStart').onchange = (e) => {
    settings.homeAtStart = e.target.checked;
    saveSettings();
  };
}

// ---- Boot ----------------------------------------------------------------

syncSettingsUI();
initDrums();
initKitRack();
initStage();
initLessons();
initBooth();
initScore();
initBand();
initLyrics();
initStudio();
initChurch();
initAsk();
initPuppet();
initConverter();
initSongs();
initHome();
applyLayout();
applyLiveInstruments();
buildMixer();
renderLoops();
updateTitle();
updateTransposeUI();
setRate(1);
initMidi();
window.addEventListener('resize', () => {
  panels.filter((p) => p.classList.contains('floating')).forEach(clampFloating);
  markDirty();
});
// Mouse/touch clicks shouldn't leave buttons focused, so Space stays play/pause.
document.addEventListener('pointerup', (e) => e.target.closest?.('button')?.blur());
document.addEventListener('fullscreenchange', markDirty);
// Unlock audio on the first interaction anywhere.
window.addEventListener('pointerdown', () => synth.ensure(), { once: true });
window.addEventListener('keydown', () => synth.ensure(), { once: true });
requestAnimationFrame(frame);
loadAppChurch().then(() => {
  openFromHash();
  if (!location.hash && settings.homeAtStart !== false) openHome();
});
window.addEventListener('hashchange', openFromHash);
