/*
 * W.O.M.P. WHISTLE: the G-funk high lead
 * Knight Lyfe · Weapons of Mass Production
 *
 * Logic Pro Scripter MIDI FX for the high portamento sine/triangle lead
 * (Retro Synth: one sine or triangle oscillator, filter open, short attack).
 * Set the synth's Pitch Bend range (up and down) to match "Bend Range".
 * Play legato: overlapping notes slide. Vibrato fades in after the note
 * has been held for "Vibrato Delay", which gives the singing, whining West Coast lead.
 * Tip: duplicate the track with Octave -1 at -12 dB for a thicker lead.
 * Save As "WOMP Whistle".
 */

var PluginParameters = [
  { name: "Mode", type: "menu", valueStrings: ["Legato Slide", "Retrigger + Slide"], defaultValue: 0 },
  { name: "Glide Time", type: "lin", minValue: 0, maxValue: 600, numberOfSteps: 600, defaultValue: 180, unit: "ms" },
  { name: "Glide Curve", type: "menu", valueStrings: ["Smooth (fast start)", "Linear"], defaultValue: 1 },
  { name: "Bend Range", type: "lin", minValue: 1, maxValue: 24, numberOfSteps: 23, defaultValue: 12, unit: "semi" },
  { name: "Octave", type: "lin", minValue: -1, maxValue: 2, numberOfSteps: 3, defaultValue: 1 },
  { name: "Vibrato Rate", type: "lin", minValue: 1, maxValue: 9, numberOfSteps: 80, defaultValue: 5.2, unit: "Hz" },
  { name: "Vibrato Depth", type: "lin", minValue: 0, maxValue: 60, numberOfSteps: 60, defaultValue: 22, unit: "cents" },
  { name: "Vibrato Delay", type: "lin", minValue: 0, maxValue: 1000, numberOfSteps: 100, defaultValue: 280, unit: "ms" },
  { name: "Vibrato Rise", type: "lin", minValue: 0, maxValue: 1000, numberOfSteps: 100, defaultValue: 350, unit: "ms" }
];

// Vibrato restarts on each new target note so slides stay clean
var vibAnchor = 0;

function vibratoSemis() {
  var depth = GetParameter("Vibrato Depth") / 100;          // cents -> semitones
  if (depth <= 0 || sounding === null) return 0;
  var held_ms = Date.now() - vibAnchor - GetParameter("Vibrato Delay");
  if (held_ms <= 0) return 0;
  var rise = GetParameter("Vibrato Rise");
  var amt = rise > 0 ? Math.min(1, held_ms / rise) : 1;
  return depth * amt * Math.sin(2 * Math.PI * GetParameter("Vibrato Rate") * held_ms / 1000);
}
