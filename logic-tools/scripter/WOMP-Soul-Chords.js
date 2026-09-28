/*
 * W.O.M.P. SOUL CHORDS: one finger in, 70s soul and gospel voicings out
 * Knight Lyfe · Weapons of Mass Production
 *
 * Logic Pro Scripter MIDI FX. Put it on a Vintage Electric Piano, Vintage B3,
 * Clav, Strings, or Studio Horns track. Set the Key and Scale to the song,
 * then play single notes: each note becomes a diatonic chord built on that
 * scale degree, voiced like a session keyboardist would.
 *   Dorian (G-Funk): in a minor key the IV chord turns dominant (the lowrider sound)
 *   Soul 9ths:       root, 3rd, 7th, 9th (no 5th: lush and open)
 *   Gospel 13ths:    root, 3rd, 7th, 9th, 13th
 *   Minor 11 Stack:  root, 5th, 7th, 9th, 11th (dark, cinematic)
 * Out-of-key notes can become 7#9 tension chords, which suit STALEMATE.
 * Save As "WOMP Soul Chords".
 */

var NOTE_NAMES = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
var SCALES = [
  [0, 2, 3, 5, 7, 8, 10],   // Minor (Aeolian)
  [0, 2, 3, 5, 7, 9, 10],   // Dorian (G-Funk)
  [0, 2, 4, 5, 7, 9, 11],   // Major (Soul)
  [0, 2, 4, 5, 7, 9, 10]    // Mixolydian (Funk)
];
// Chord tones as stacked-third steps: 0 root, 1 third, 2 fifth, 3 seventh, 4 ninth, 5 eleventh, 6 thirteenth
var STYLES = [
  [0, 1, 3, 4],      // Soul 9ths
  [0, 1, 2, 3, 4],   // Full 9ths
  [0, 1, 3, 4, 6],   // Gospel 13ths
  [0, 2, 3, 4, 5],   // Minor 11 Stack
  [0, 1, 2, 3],      // 7ths
  [0, 1, 2]          // Triads
];
var TENSION_7S9 = [0, 4, 10, 15];

var PluginParameters = [
  { name: "Key", type: "menu", valueStrings: NOTE_NAMES, defaultValue: 1 },
  { name: "Scale", type: "menu", valueStrings: ["Minor (Aeolian)", "Dorian (G-Funk)", "Major (Soul)", "Mixolydian (Funk)"], defaultValue: 1 },
  { name: "Chord Style", type: "menu", valueStrings: ["Soul 9ths", "Full 9ths", "Gospel 13ths", "Minor 11 Stack", "7ths", "Triads"], defaultValue: 0 },
  { name: "Voicing", type: "menu", valueStrings: ["Close", "Open (spread 3rd)", "Drop 2"], defaultValue: 2 },
  { name: "Bass Note", type: "menu", valueStrings: ["Off", "-1 Octave", "-2 Octaves"], defaultValue: 0 },
  { name: "Out-of-Key Notes", type: "menu", valueStrings: ["7#9 Tension Chord", "Pass Through", "Ignore"], defaultValue: 0 },
  { name: "Strum", type: "lin", minValue: 0, maxValue: 80, numberOfSteps: 80, defaultValue: 12, unit: "ms" },
  { name: "Strum Direction", type: "menu", valueStrings: ["Up", "Down", "Random"], defaultValue: 0 },
  { name: "Top Note Accent", type: "lin", minValue: 0, maxValue: 30, numberOfSteps: 30, defaultValue: 8 },
  { name: "Velocity Spread", type: "lin", minValue: 0, maxValue: 20, numberOfSteps: 20, defaultValue: 6 }
];

var active = {};      // "channel:inputPitch" -> [{pitch, delay}]
var refCount = {};    // "channel:outputPitch" -> count
var lastOnAt = {};    // "channel:outputPitch" -> ms time its latest note-on sounds

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function mod(a, n) { return ((a % n) + n) % n; }

// Returns semitone offsets from the played note (including 0), or null to ignore.
function chordIntervals(pitch) {
  var key = GetParameter("Key");
  var scale = SCALES[GetParameter("Scale")];
  var rel = mod(pitch - key, 12);
  var degree = scale.indexOf(rel);

  if (degree === -1) {
    var mode = GetParameter("Out-of-Key Notes");
    if (mode === 0) return TENSION_7S9.slice();
    if (mode === 1) return [0];
    return null;
  }

  var steps = STYLES[GetParameter("Chord Style")];
  var ints = [];
  for (var i = 0; i < steps.length; i++) {
    var idx = degree + steps[i] * 2;
    var semis = scale[idx % 7] - scale[degree] + 12 * Math.floor(idx / 7);
    ints.push(semis);
  }
  ints.sort(function (a, b) { return a - b; });

  var voicing = GetParameter("Voicing");
  if (voicing === 1 && ints.length >= 3) {
    ints[1] += 12;                                   // spread the 3rd up an octave
  } else if (voicing === 2 && ints.length >= 4) {
    ints[ints.length - 2] -= 12;                     // drop the 2nd-from-top voice
  }
  ints.sort(function (a, b) { return a - b; });

  var bass = GetParameter("Bass Note");
  if (bass > 0) ints.unshift(-12 * bass);

  // Deduplicate
  var out = [];
  for (var j = 0; j < ints.length; j++) if (out.indexOf(ints[j]) === -1) out.push(ints[j]);
  return out;
}

function HandleMIDI(event) {
  if (event instanceof NoteOn && event.velocity > 0) {
    var ints = chordIntervals(event.pitch);
    if (ints === null) return;

    var pitches = [];
    for (var i = 0; i < ints.length; i++) {
      var p = event.pitch + ints[i];
      if (p >= 0 && p <= 127) pitches.push(p);
    }
    pitches.sort(function (a, b) { return a - b; });

    var dir = GetParameter("Strum Direction");
    var order = pitches.slice();
    if (dir === 1) order.reverse();
    if (dir === 2) order.sort(function () { return Math.random() - 0.5; });

    var strum = GetParameter("Strum");
    var spread = GetParameter("Velocity Spread");
    var top = pitches[pitches.length - 1];
    var notes = [];

    for (var k = 0; k < order.length; k++) {
      var on = new NoteOn(event);
      on.pitch = order[k];
      var v = event.velocity + (Math.random() * 2 - 1) * spread;
      if (order[k] === top) v += GetParameter("Top Note Accent");
      on.velocity = Math.round(clamp(v, 1, 127));
      var delay = k * strum;
      var rk = event.channel + ":" + on.pitch;
      refCount[rk] = (refCount[rk] || 0) + 1;
      lastOnAt[rk] = Math.max(lastOnAt[rk] || 0, Date.now() + delay);
      if (delay > 0) on.sendAfterMilliseconds(delay); else on.send();
      notes.push({ pitch: on.pitch, delay: delay });
    }
    active[event.channel + ":" + event.pitch] = notes;
    return;
  }

  if (event instanceof NoteOff || (event instanceof NoteOn && event.velocity === 0)) {
    var key = event.channel + ":" + event.pitch;
    var list = active[key];
    if (!list) { event.send(); return; }
    delete active[key];
    for (var n = 0; n < list.length; n++) {
      var rk2 = event.channel + ":" + list[n].pitch;
      refCount[rk2] = (refCount[rk2] || 1) - 1;
      if (refCount[rk2] > 0) continue;            // still held by another chord
      delete refCount[rk2];
      var off = new NoteOff(event);
      off.pitch = list[n].pitch;
      // Never release before the latest strummed note-on of this pitch has sounded
      var wait = (lastOnAt[rk2] || 0) - Date.now();
      delete lastOnAt[rk2];
      if (wait > 0) off.sendAfterMilliseconds(wait + 1); else off.send();
    }
    return;
  }

  event.send();
}

function Reset() { active = {}; refCount = {}; lastOnAt = {}; }
