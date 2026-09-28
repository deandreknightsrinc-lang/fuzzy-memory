// ---- W.O.M.P. glide engine (shared by 808 Glide and Whistle) ----
// Mono, last-note priority. Overlapping notes become pitch-bend slides on
// one sounding note. Set the synth/sampler's pitch-bend range to match
// "Bend Range" (Retro Synth, Sampler, ES2: set Pitch Bend Up/Down).

var held = [];            // held input keys, in press order
var sounding = null;      // actual MIDI note currently sounding
var lastVel = 100;
var lastChannel = 1;
var bendCur = 0;          // semitones currently applied
var ramp = null;          // {from, to, start, dur}
var sentBend = 0;         // last 14-bit bend value sent
var phraseStart = 0;      // ms timestamp of the current phrase (for vibrato)

function now() { return Date.now(); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function sendBendSemis(semis, extraSemis) {
  var range = GetParameter("Bend Range");
  var total = semis + (extraSemis || 0);
  var v = Math.round(clamp(total / range * 8192, -8192, 8191));
  if (v === sentBend) return;
  var pb = new PitchBend();
  pb.channel = lastChannel;
  pb.value = v;
  pb.send();
  sentBend = v;
}

function startRamp(toSemis, ms) {
  if (ms <= 0) { ramp = null; bendCur = toSemis; sendBendSemis(bendCur, vibratoSemis()); return; }
  ramp = { from: bendCur, to: toSemis, start: now(), dur: ms };
}

function noteOn(pitch, vel, channel) {
  var out = new NoteOn();
  out.pitch = pitch; out.velocity = vel; out.channel = channel;
  out.send();
}
function noteOff(pitch, channel) {
  var off = new NoteOff();
  off.pitch = pitch; off.velocity = 0; off.channel = channel;
  off.send();
}

function glideTo(targetPitch) {
  startRamp(targetPitch - sounding, GetParameter("Glide Time"));
}

function engineNoteOn(pitch, vel, channel) {
  var range = GetParameter("Bend Range");
  var retrigger = GetParameter("Mode") === 1;
  lastChannel = channel;
  held.push(pitch);

  if (sounding !== null) {
    var currentPitch = sounding + bendCur;
    var interval = pitch - currentPitch;
    if (!retrigger && Math.abs(pitch - sounding) <= range) {
      glideTo(pitch);                         // legato slide, no new attack
      return;
    }
    if (retrigger && Math.abs(interval) <= range) {
      noteOff(sounding, channel);             // new attack that slides in
      sounding = pitch;
      bendCur = currentPitch - pitch;
      ramp = null;
      sendBendSemis(bendCur, 0);
      noteOn(pitch, vel, channel);
      lastVel = vel;
      startRamp(0, GetParameter("Glide Time"));
      return;
    }
    noteOff(sounding, channel);               // too far to bend: plain retrigger
  }

  // Fresh note
  sounding = pitch;
  ramp = null;
  bendCur = 0;
  phraseStart = now();
  sendBendSemis(0, 0);
  noteOn(pitch, vel, channel);
  lastVel = vel;
}

function engineNoteOff(pitch, channel) {
  var idx = held.lastIndexOf(pitch);
  if (idx === -1) return;
  var wasTop = idx === held.length - 1;
  held.splice(idx, 1);
  if (sounding === null) return;

  if (held.length === 0) {
    noteOff(sounding, channel);
    sounding = null;
    ramp = null;
    return;
  }
  if (wasTop) {
    var back = held[held.length - 1];
    if (Math.abs(back - sounding) <= GetParameter("Bend Range")) {
      glideTo(back);
    } else {
      noteOff(sounding, channel);
      sounding = back; bendCur = 0; ramp = null;
      sendBendSemis(0, 0);
      noteOn(back, lastVel, channel);
    }
  }
}

function engineProcess() {
  if (ramp) {
    var t = clamp((now() - ramp.start) / ramp.dur, 0, 1);
    var shape = GetParameter("Glide Curve") === 1 ? t : 1 - (1 - t) * (1 - t);
    bendCur = ramp.from + (ramp.to - ramp.from) * shape;
    if (t >= 1) { bendCur = ramp.to; ramp = null; }
  }
  if (sounding !== null) sendBendSemis(bendCur, vibratoSemis());
}

function engineReset() {
  if (sounding !== null) noteOff(sounding, lastChannel);
  held = []; sounding = null; ramp = null; bendCur = 0;
  sentBend = 1;             // force the next send
  sendBendSemis(0, 0);
}
// ---- end glide engine ----
