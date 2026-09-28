/*
 * W.O.M.P. ROLLS: hi-hat rolls and 808 stutters
 * Knight Lyfe · Weapons of Mass Production
 *
 * Logic Pro Scripter MIDI FX. Put it on the drum track (before or after
 * WOMP Pocket) for hi-hat rolls, or on the 808 track with Roll Target
 * "Single Note" for 808 stutters.
 * A note that meets the trigger becomes a burst of fast repeats at the chosen rate,
 * locked to the song tempo and lasting "Roll Length". Velocity can build up or
 * fade out. Everything else passes through untouched.
 * Trigger by velocity: write the hat you want rolled at high velocity (e.g. 115+).
 * Trigger by chance: rolls sprinkle in by themselves, great for Suno-style bounce.
 * Save As "WOMP Rolls".
 */

var NeedsTimingInfo = true;

var HATS = [42, 44, 46];
var RATES = [1 / 6, 1 / 8, 1 / 12, 1 / 16];     // in beats: 1/16T, 1/32, 1/32T, 1/64
var LENGTHS = [0.25, 0.5, 1];                   // in beats: 1/16, 1/8, 1/4

var PluginParameters = [
  { name: "Roll Target", type: "menu", valueStrings: ["Hi-Hats", "All Notes", "Single Note"], defaultValue: 0 },
  { name: "Single Note", type: "lin", minValue: 0, maxValue: 127, numberOfSteps: 127, defaultValue: 36 },
  { name: "Trigger", type: "menu", valueStrings: ["Velocity Threshold", "Random Chance", "Both"], defaultValue: 0 },
  { name: "Velocity Threshold", type: "lin", minValue: 1, maxValue: 127, numberOfSteps: 126, defaultValue: 110 },
  { name: "Roll Chance", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 15, unit: "%" },
  { name: "Roll Rate", type: "menu", valueStrings: ["1/16T", "1/32", "1/32T", "1/64"], defaultValue: 1 },
  { name: "Roll Length", type: "menu", valueStrings: ["1/16", "1/8", "1/4"], defaultValue: 1 },
  { name: "Velocity Shape", type: "menu", valueStrings: ["Flat", "Crescendo", "Decrescendo"], defaultValue: 1 }
];

var rolled = {};   // "channel:pitch" -> number of rolls whose note-off must be swallowed

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function isTarget(p) {
  var t = GetParameter("Roll Target");
  if (t === 0) return HATS.indexOf(p) !== -1;
  if (t === 1) return true;
  return p === GetParameter("Single Note");
}

function triggered(vel) {
  var mode = GetParameter("Trigger");
  var byVel = vel >= GetParameter("Velocity Threshold");
  var byChance = Math.random() * 100 < GetParameter("Roll Chance");
  if (mode === 0) return byVel;
  if (mode === 1) return byChance;
  return byVel || byChance;
}

function HandleMIDI(event) {
  if (event instanceof NoteOn && event.velocity > 0) {
    if (!isTarget(event.pitch) || !triggered(event.velocity)) { event.send(); return; }

    var info = GetTimingInfo();
    var tempo = info && info.tempo > 0 ? info.tempo : 120;
    var beatMs = 60000 / tempo;
    var stepMs = RATES[GetParameter("Roll Rate")] * beatMs;
    var count = Math.max(2, Math.round(LENGTHS[GetParameter("Roll Length")] / RATES[GetParameter("Roll Rate")]));
    var gate = Math.max(5, Math.min(stepMs * 0.8, 60));
    var shape = GetParameter("Velocity Shape");

    for (var i = 0; i < count; i++) {
      var pos = count > 1 ? i / (count - 1) : 1;
      var scale = shape === 1 ? 0.55 + 0.45 * pos : shape === 2 ? 1 - 0.45 * pos : 1;
      var on = new NoteOn(event);
      on.velocity = Math.round(clamp(event.velocity * scale, 1, 127));
      var off = new NoteOff(on);
      var t = i * stepMs;
      if (t > 0) on.sendAfterMilliseconds(t); else on.send();
      off.sendAfterMilliseconds(t + gate);
    }
    var key = event.channel + ":" + event.pitch;
    rolled[key] = (rolled[key] || 0) + 1;
    return;
  }

  if (event instanceof NoteOff || (event instanceof NoteOn && event.velocity === 0)) {
    var k = event.channel + ":" + event.pitch;
    if (rolled[k]) {                 // the roll already schedules its own note-offs
      rolled[k] -= 1;
      if (rolled[k] === 0) delete rolled[k];
      return;
    }
    event.send();
    return;
  }

  event.send();
}

function Reset() { rolled = {}; }
