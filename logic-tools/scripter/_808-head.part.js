/*
 * W.O.M.P. 808 GLIDE: melodic sliding 808s
 * Knight Lyfe · Weapons of Mass Production
 *
 * Logic Pro Scripter MIDI FX. Put it on your 808 track (Sampler, Quick
 * Sampler, Retro Synth, ES2...). Then:
 *   1. Set the instrument's Pitch Bend range (up AND down) to the same value
 *      as "Bend Range" below (12 is the classic choice).
 *   2. Set the instrument to MONO / legato if it has the option.
 *   3. Overlap two notes in the piano roll to make them slide.
 * Modes:
 *   Legato Slide:        overlapping notes glide on ONE attack (smooth sub)
 *   Retrigger + Slide:   every note hits fresh but slides in from the last pitch
 * Save As "WOMP 808 Glide".
 */

var PluginParameters = [
  { name: "Mode", type: "menu", valueStrings: ["Legato Slide", "Retrigger + Slide"], defaultValue: 0 },
  { name: "Glide Time", type: "lin", minValue: 0, maxValue: 400, numberOfSteps: 400, defaultValue: 90, unit: "ms" },
  { name: "Glide Curve", type: "menu", valueStrings: ["808 (fast start)", "Linear"], defaultValue: 0 },
  { name: "Bend Range", type: "lin", minValue: 1, maxValue: 24, numberOfSteps: 23, defaultValue: 12, unit: "semi" },
  { name: "Octave", type: "lin", minValue: -2, maxValue: 1, numberOfSteps: 3, defaultValue: 0 },
  { name: "Velocity Floor", type: "lin", minValue: 1, maxValue: 127, numberOfSteps: 126, defaultValue: 90 }
];

function vibratoSemis() { return 0; }
