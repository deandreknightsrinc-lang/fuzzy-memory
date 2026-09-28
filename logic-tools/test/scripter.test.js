const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { load } = require("./scripter-mock");
const S = (f) => path.join(__dirname, "..", "scripter", f);

// Every note-on must have a later-or-equal note-off for the same pitch.
function assertBalanced(out) {
  const ons = {}, offs = {};
  for (const e of out) {
    if (e.type === "NoteOn") (ons[e.pitch] = ons[e.pitch] || []).push(e.t);
    if (e.type === "NoteOff") (offs[e.pitch] = offs[e.pitch] || []).push(e.t);
  }
  for (const p of Object.keys(ons)) {
    assert.ok(offs[p], `pitch ${p} never released`);
    assert.ok(Math.max(...offs[p]) >= Math.max(...ons[p]), `pitch ${p} released before its last note-on`);
  }
}

test("Pocket: plugin parameters are well-formed", () => {
  const s = load(S("WOMP-Pocket.js"));
  for (const p of s.ctx.PluginParameters) assert.ok(p.name && p.type);
});

test("Pocket: swings 16th off-beats, leaves downbeats, delays note-off equally", () => {
  const s = load(S("WOMP-Pocket.js"), {
    params: { "Timing Humanize": 0, "Velocity Humanize": 0, "Hat Accents": 0, "Swing %": 56 },
    timing: { playing: true, tempo: 90 },
  });
  s.on(42, 100, { beatPos: 1.0 });  s.off(42);
  s.on(42, 100, { beatPos: 1.25 }); s.off(42);
  const [down, swung] = s.notes("NoteOn");
  assert.strictEqual(down.t, 0);
  // (0.56*0.5 - 0.25) beats = 0.03 beats = 20 ms at 90 BPM
  assert.ok(Math.abs(swung.t - 20) < 0.01, `expected 20ms, got ${swung.t}`);
  assertBalanced(s.out);
});

test("Pocket: snare lay-back applies and kick stays on grid", () => {
  const s = load(S("WOMP-Pocket.js"), {
    params: { "Timing Humanize": 0, "Velocity Humanize": 0, "Snare/Clap Lay-back": 15 },
    timing: { playing: true, tempo: 90 },
  });
  s.on(36, 110, { beatPos: 1 }); s.on(38, 110, { beatPos: 2 }); s.off(36); s.off(38);
  const ons = s.notes("NoteOn");
  assert.strictEqual(ons.find((e) => e.pitch === 36).t, 0);
  assert.strictEqual(ons.find((e) => e.pitch === 38).t, 15);
  assertBalanced(s.out);
});

test("Pocket: velocities stay in MIDI range under heavy humanize", () => {
  const s = load(S("WOMP-Pocket.js"), { params: { "Velocity Humanize": 30 }, timing: { playing: true, tempo: 95 } });
  for (let i = 0; i < 200; i++) { s.on(42, i % 2 ? 127 : 1, { beatPos: 1 + i * 0.25 }); s.off(42); }
  for (const e of s.notes("NoteOn")) assert.ok(e.velocity >= 1 && e.velocity <= 127);
});

test("Pocket: ghost snare lands one 16th after the snare, at ghost velocity", () => {
  const s = load(S("WOMP-Pocket.js"), {
    params: { "Ghost Snare Chance": 100, "Timing Humanize": 0, "Snare/Clap Lay-back": 0, "Velocity Humanize": 0 },
    timing: { playing: true, tempo: 90 },
  });
  s.on(38, 110, { beatPos: 2 }); s.off(38);
  const ons = s.notes("NoteOn").filter((e) => e.pitch === 38);
  assert.strictEqual(ons.length, 2);
  assert.ok(Math.abs(ons[1].t - 166.67) < 0.1);
  assert.ok(ons[1].velocity <= 32);
  assertBalanced(s.out);
});

for (const file of ["WOMP-808-Glide.js", "WOMP-Whistle.js"]) {
  test(`${file}: legato overlap slides with pitch bend, no second attack`, () => {
    const s = load(S(file), { params: { "Octave": 0, "Vibrato Depth": 0 } });
    s.on(36); s.advance(50);
    s.on(43); s.advance(700);
    const ons = s.notes("NoteOn");
    assert.strictEqual(ons.length, 1, "legato must not retrigger");
    const lastBend = s.notes("PitchBend").pop().value;
    // +7 semitones with a 12-semi range = 7/12*8192
    assert.ok(Math.abs(lastBend - Math.round(7 / 12 * 8192)) <= 1, `bend ${lastBend}`);
    s.off(43); s.advance(700);          // falls back to the held 36
    assert.strictEqual(s.notes("PitchBend").pop().value, 0);
    s.off(36);
    assertBalanced(s.out);
  });

  test(`${file}: retrigger mode re-attacks and slides in from the previous pitch`, () => {
    const s = load(S(file), { params: { "Mode": 1, "Octave": 0, "Vibrato Depth": 0 } });
    s.on(36); s.advance(50); s.on(31);
    const bends = s.notes("PitchBend");
    // new note 31 should start bent up +5 toward 36
    assert.ok(bends.some((b) => Math.abs(b.value - Math.round(5 / 12 * 8192)) <= 1));
    s.advance(700);
    assert.strictEqual(s.notes("PitchBend").pop().value, 0);
    assert.strictEqual(s.notes("NoteOn").length, 2);
    s.off(36); s.off(31);
    assertBalanced(s.out);
  });

  test(`${file}: intervals beyond bend range retrigger cleanly`, () => {
    const s = load(S(file), { params: { "Bend Range": 2, "Octave": 0, "Vibrato Depth": 0 } });
    s.on(36); s.advance(20); s.on(48); s.advance(200); s.off(48); s.off(36);
    // 36, then 48 retriggered, then back to the still-held 36 (last-note priority)
    assert.deepStrictEqual(s.notes("NoteOn").map((e) => e.pitch), [36, 48, 36]);
    assertBalanced(s.out);
  });

  test(`${file}: bend values always stay within 14-bit range`, () => {
    const s = load(S(file), { params: { "Bend Range": 1, "Octave": 0 } });
    s.on(60); s.advance(10); s.on(61); s.advance(2000);
    for (const b of s.notes("PitchBend")) assert.ok(b.value >= -8192 && b.value <= 8191);
    s.off(61); s.off(60); assertBalanced(s.out);
  });
}

test("Whistle: octave shift and delayed vibrato", () => {
  const s = load(S("WOMP-Whistle.js"), { params: { "Vibrato Depth": 30, "Vibrato Delay": 300, "Vibrato Rise": 100 } });
  s.on(60); s.advance(250);
  assert.strictEqual(s.notes("NoteOn")[0].pitch, 72, "default +1 octave");
  const early = s.notes("PitchBend").filter((b) => b.t > 0 && b.t < 290).map((b) => b.value);
  assert.ok(early.every((v) => v === 0), "no vibrato before delay");
  s.advance(600);
  const late = s.notes("PitchBend").filter((b) => b.t > 450).map((b) => Math.abs(b.value));
  assert.ok(Math.max(...late) > 150, "vibrato present after delay");
  s.off(60); assertBalanced(s.out);
});

test("Soul Chords: Dorian in C#m gives a C#m9-type voicing and F# dominant 9", () => {
  const s = load(S("WOMP-Soul-Chords.js"), { params: { "Key": 1, "Scale": 1, "Chord Style": 0, "Voicing": 0, "Strum": 0, "Velocity Spread": 0 } });
  s.on(61); // C#4
  const i = s.notes("NoteOn").map((e) => e.pitch - 61).sort((a, b) => a - b);
  assert.deepStrictEqual(i, [0, 3, 10, 14]); // 1 b3 b7 9
  s.off(61);
  s.out.length = 0;
  s.on(66); // F# = IV in C# Dorian
  const iv = s.notes("NoteOn").map((e) => e.pitch - 66).sort((a, b) => a - b);
  assert.deepStrictEqual(iv, [0, 4, 10, 14]); // 1 3 b7 9 -> F#9
  s.off(66);
  assertBalanced(s.out);
});

test("Soul Chords: major key Gospel 13ths on the V chord", () => {
  const s = load(S("WOMP-Soul-Chords.js"), { params: { "Key": 3, "Scale": 2, "Chord Style": 2, "Voicing": 0, "Strum": 0 } });
  s.on(70); // Bb = V in Eb major
  const i = s.notes("NoteOn").map((e) => e.pitch - 70).sort((a, b) => a - b);
  assert.deepStrictEqual(i, [0, 4, 10, 14, 21]); // Bb13: 1 3 b7 9 13
  s.off(70); assertBalanced(s.out);
});

test("Soul Chords: out-of-key note becomes 7#9, and Ignore mode drops it", () => {
  const s = load(S("WOMP-Soul-Chords.js"), { params: { "Key": 0, "Scale": 2, "Strum": 0 } });
  s.on(61); // C# not in C major
  assert.deepStrictEqual(s.notes("NoteOn").map((e) => e.pitch - 61).sort((a, b) => a - b), [0, 4, 10, 15]);
  s.off(61);
  const t = load(S("WOMP-Soul-Chords.js"), { params: { "Key": 0, "Scale": 2, "Out-of-Key Notes": 2 } });
  t.on(61); t.off(61);
  assert.strictEqual(t.notes("NoteOn").length, 0);
});

test("Soul Chords: shared notes between overlapping chords are released only when both lift; strum offsets note-offs", () => {
  const s = load(S("WOMP-Soul-Chords.js"), { params: { "Key": 0, "Scale": 2, "Chord Style": 5, "Voicing": 0, "Strum": 20 } });
  s.on(60); s.on(64);          // C (C E G) and Em (E G B) share E and G
  s.off(60);
  const offsAfterFirst = s.notes("NoteOff").map((e) => e.pitch).sort();
  assert.deepStrictEqual(offsAfterFirst, [60]);
  s.off(64);
  assertBalanced(s.out);
  for (const off of s.notes("NoteOff")) {
    const on = s.notes("NoteOn").filter((e) => e.pitch === off.pitch).pop();
    assert.ok(off.t >= on.t);
  }
});

test("Soul Chords: voicings stay within MIDI range at extremes", () => {
  const s = load(S("WOMP-Soul-Chords.js"), { params: { "Chord Style": 2, "Bass Note": 2, "Voicing": 1 } });
  for (const p of [0, 5, 120, 127]) { s.on(p); s.off(p); }
  for (const e of s.out) if (e.pitch !== undefined) assert.ok(e.pitch >= 0 && e.pitch <= 127);
  assertBalanced(s.out);
});

test("Rolls: high-velocity hat becomes a tempo-locked 1/32 roll with crescendo", () => {
  const s = load(S("WOMP-Rolls.js"), { timing: { playing: true, tempo: 150 } });
  s.on(42, 120); s.off(42);
  const ons = s.notes("NoteOn");
  assert.strictEqual(ons.length, 4);                 // 1/8 length / 1/32 rate
  const step = (1 / 8) * 60000 / 150;                // 50 ms
  ons.forEach((e, i) => assert.ok(Math.abs(e.t - i * step) < 0.01));
  assert.ok(ons[0].velocity < ons[3].velocity, "crescendo");
  assert.strictEqual(s.notes("NoteOff").length, 4, "user note-off swallowed, roll owns its offs");
  assertBalanced(s.out);
});

test("Rolls: low-velocity hats and non-target notes pass through untouched", () => {
  const s = load(S("WOMP-Rolls.js"), { timing: { playing: true, tempo: 96 } });
  s.on(42, 90); s.off(42); s.on(38, 127); s.off(38);
  assert.deepStrictEqual(s.out.map((e) => [e.type, e.pitch, e.velocity]),
    [["NoteOn", 42, 90], ["NoteOff", 42, 0], ["NoteOn", 38, 127], ["NoteOff", 38, 0]]);
});

test("Rolls: Single Note mode stutters the 808 at 1/16T over a quarter", () => {
  const s = load(S("WOMP-Rolls.js"), {
    params: { "Roll Target": 2, "Single Note": 36, "Trigger": 1, "Roll Chance": 100, "Roll Rate": 0, "Roll Length": 2, "Velocity Shape": 0 },
    timing: { playing: true, tempo: 100 },
  });
  s.on(36, 100); s.off(36); s.on(37, 100); s.off(37);
  const ons36 = s.notes("NoteOn").filter((e) => e.pitch === 36);
  assert.strictEqual(ons36.length, 6);
  assert.ok(ons36.every((e) => e.velocity === 100));
  assert.strictEqual(s.notes("NoteOn").filter((e) => e.pitch === 37).length, 1);
  assertBalanced(s.out);
});

test("Rolls: velocities stay in range and rolls work with transport stopped", () => {
  const s = load(S("WOMP-Rolls.js"), { params: { "Roll Rate": 3, "Roll Length": 2, "Velocity Shape": 2 }, timing: { playing: false, tempo: 0 } });
  s.on(46, 127); s.off(46);
  const ons = s.notes("NoteOn");
  assert.strictEqual(ons.length, 16);
  for (const e of ons) assert.ok(e.velocity >= 1 && e.velocity <= 127);
  assertBalanced(s.out);
});
