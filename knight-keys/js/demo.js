// Built-in demo: an 8-bar neo-soul/gospel progression on EP, bass and drums.
import { writeMidi } from './midi-file.js';

const BPM = 80;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// [bass note, right-hand voicing]
const PROGRESSION = [
  [36, [52, 55, 59, 62]], // Cmaj9
  [45, [48, 52, 55, 59]], // Am9
  [38, [53, 57, 60, 64]], // Dm9
  [43, [53, 57, 59, 64]], // G13
  [40, [50, 55, 59, 62]], // Em7
  [45, [55, 60, 61, 67]], // A7#9
  [38, [53, 55, 60, 64]], // Dm11
  [43, [53, 56, 59, 62]], // G7b9
];

export function createDemoMidi() {
  const ev = [];
  const add = (time, bytes) => ev.push({ time, bytes });
  add(0, [0xff, 0x59, 0x02, 0x00, 0x00]); // C major
  add(0, [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08]); // 4/4
  add(0, [0xc0, 4]); // EP
  add(0, [0xc1, 33]); // fingered bass
  add(0, [0xb0, 7, 100]);
  add(0, [0xb1, 7, 110]);
  add(0, [0xb9, 7, 80]);

  PROGRESSION.forEach(([bass, chord], bar) => {
    const t = bar * BAR;
    // Piano: roll the chord slightly, pedal down just after the attack.
    chord.forEach((n, i) => {
      add(t + i * 0.012, [0x90, n, 72 + i * 4]);
      add(t + BAR - 0.08, [0x80, n, 0]);
    });
    add(t + 0.05, [0xb0, 64, 127]);
    add(t + BAR - 0.04, [0xb0, 64, 0]);
    // Push on beat 4-and with a top-note neighbor.
    const top = chord[chord.length - 1];
    add(t + BEAT * 3.5, [0x90, top + 2, 64]);
    add(t + BEAT * 3.9, [0x80, top + 2, 0]);

    // Bass: root held for three beats, then a fifth below as a pickup.
    const line = [
      [0, bass, 2.9],
      [3, bass - 5, 0.9],
    ];
    for (const [beat, n, len] of line) {
      add(t + beat * BEAT, [0x91, n, 96]);
      add(t + (beat + len) * BEAT - 0.02, [0x81, n, 0]);
    }

    // Drums: kick 1 & 3-and, rim 2 & 4, hats on eighths.
    for (let e = 0; e < 8; e++) {
      const et = t + e * (BEAT / 2);
      add(et, [0x99, 42, e % 2 ? 50 : 70]);
      add(et + 0.05, [0x89, 42, 0]);
    }
    for (const b of [0, 2.5]) {
      add(t + b * BEAT, [0x99, 36, 100]);
      add(t + b * BEAT + 0.1, [0x89, 36, 0]);
    }
    for (const b of [1, 3]) {
      add(t + b * BEAT, [0x99, 37, 85]);
      add(t + b * BEAT + 0.1, [0x89, 37, 0]);
    }
  });

  // Final chord
  const end = PROGRESSION.length * BAR;
  [36, 52, 55, 59, 62, 64].forEach((n, i) => {
    add(end + i * 0.015, [i === 0 ? 0x91 : 0x90, n, 75]);
    add(end + BAR * 1.5, [i === 0 ? 0x81 : 0x80, n, 0]);
  });
  add(end, [0x99, 49, 90]);
  add(end + 0.1, [0x89, 49, 0]);

  return writeMidi(ev, { bpm: BPM, name: 'Knight Keys Demo - Neo-Soul Changes' });
}
