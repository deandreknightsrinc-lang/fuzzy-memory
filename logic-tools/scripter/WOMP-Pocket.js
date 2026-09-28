/*
 * W.O.M.P. POCKET: West Coast groove engine
 * Knight Lyfe · Weapons of Mass Production
 *
 * Logic Pro Scripter MIDI FX. Put it on a Drum Machine Designer or drum
 * kit track (MIDI FX slot > Scripter > paste > Run > Save As "WOMP Pocket").
 *
 * - Swings 16ths or 8ths (50% = straight, 66.7% = triplet feel)
 * - Lays the snare and clap back so the pocket leans behind the beat
 * - Humanizes timing and velocity, and accents the hats
 * - Adds optional ghost snares a 16th after each backbeat
 * Every delayed note-on has its note-off delayed by the same amount, so notes never hang.
 * Swing and ghost notes need the transport running (they use the song position);
 * lay-back and humanize also work on live playing.
 */

var NeedsTimingInfo = true;

// Standard GM / Drum Machine Designer map
var KICKS  = [35, 36];
var SNARES = [38, 40];
var CLAPS  = [39];
var RIMS   = [37];
var HATS   = [42, 44, 46];

var PluginParameters = [
  { name: "Swing %", type: "lin", minValue: 50, maxValue: 75, numberOfSteps: 250, defaultValue: 56, unit: "%" },
  { name: "Swing Grid", type: "menu", valueStrings: ["16th", "8th"], defaultValue: 0 },
  { name: "Swing Applies To", type: "menu",
    valueStrings: ["Hats & Percussion", "Everything", "Everything except Kick"], defaultValue: 2 },
  { name: "Snare/Clap Lay-back", type: "lin", minValue: 0, maxValue: 40, numberOfSteps: 40, defaultValue: 12, unit: "ms" },
  { name: "Timing Humanize", type: "lin", minValue: 0, maxValue: 15, numberOfSteps: 15, defaultValue: 3, unit: "ms" },
  { name: "Velocity Humanize", type: "lin", minValue: 0, maxValue: 30, numberOfSteps: 30, defaultValue: 8 },
  { name: "Hat Accents", type: "menu", valueStrings: ["Off", "Downbeats Loud", "Offbeats Loud"], defaultValue: 1 },
  { name: "Ghost Snare Chance", type: "lin", minValue: 0, maxValue: 100, numberOfSteps: 100, defaultValue: 0, unit: "%" },
  { name: "Ghost Velocity", type: "lin", minValue: 10, maxValue: 60, numberOfSteps: 50, defaultValue: 28 }
];

// key "channel:pitch" -> delay (ms) applied to the sounding note-on
var activeDelays = {};

function isIn(list, p) { return list.indexOf(p) !== -1; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

function swingDelayMs(beatPos, tempo) {
  var grid = GetParameter("Swing Grid") === 1 ? 0.5 : 0.25;
  var pair = grid * 2;
  var pos = beatPos - 1;                      // Logic beats are 1-based
  var phase = pos - Math.floor(pos / pair) * pair;
  if (Math.abs(phase - grid) > grid * 0.25) return 0;   // not an off-beat
  var delayBeats = (GetParameter("Swing %") / 100) * pair - grid;
  return Math.max(0, delayBeats * 60000 / tempo);
}

function wantsSwing(p) {
  var mode = GetParameter("Swing Applies To");
  if (mode === 1) return true;
  if (mode === 2) return !isIn(KICKS, p);
  return !isIn(KICKS, p) && !isIn(SNARES, p) && !isIn(CLAPS, p) && !isIn(RIMS, p);
}

function HandleMIDI(event) {
  if (event instanceof NoteOn && event.velocity > 0) {
    var info = GetTimingInfo();
    var p = event.pitch;
    var delay = 0;
    var onBeatPos = typeof event.beatPos === "number" && event.beatPos > 0;
    var timed = info && info.playing && onBeatPos && info.tempo > 0;

    if (timed && wantsSwing(p)) delay += swingDelayMs(event.beatPos, info.tempo);
    if (isIn(SNARES, p) || isIn(CLAPS, p)) delay += GetParameter("Snare/Clap Lay-back");
    delay += rand(0, GetParameter("Timing Humanize"));

    var vel = event.velocity + rand(-1, 1) * GetParameter("Velocity Humanize");
    if (isIn(HATS, p) && timed) {
      var accent = GetParameter("Hat Accents");
      var pos8 = (event.beatPos - 1) / 0.5;
      var onDown = Math.abs(pos8 - Math.round(pos8)) < 0.125;
      if (accent === 1) vel += onDown ? 10 : -10;
      if (accent === 2) vel += onDown ? -10 : 10;
    }
    event.velocity = Math.round(clamp(vel, 1, 127));

    activeDelays[event.channel + ":" + p] = delay;
    if (delay > 0) event.sendAfterMilliseconds(delay); else event.send();

    // Ghost snare one 16th after a backbeat snare
    if (timed && isIn(SNARES, p) && Math.random() * 100 < GetParameter("Ghost Snare Chance")) {
      var sixteenthMs = 0.25 * 60000 / info.tempo;
      var ghost = new NoteOn(event);
      ghost.velocity = Math.round(clamp(GetParameter("Ghost Velocity") + rand(-4, 4), 1, 127));
      var ghostOff = new NoteOff(ghost);
      ghost.sendAfterMilliseconds(delay + sixteenthMs);
      ghostOff.sendAfterMilliseconds(delay + sixteenthMs + Math.min(60, sixteenthMs * 0.8));
    }
    return;
  }

  if (event instanceof NoteOff || (event instanceof NoteOn && event.velocity === 0)) {
    var key = event.channel + ":" + event.pitch;
    var d = activeDelays[key] || 0;
    delete activeDelays[key];
    if (d > 0) event.sendAfterMilliseconds(d + 1); else event.send();
    return;
  }

  event.send();
}

function Reset() { activeDelays = {}; }
