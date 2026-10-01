// Gospel groove library and a step-sequencer player for it.
//
// Patterns are strings, one character per step (spaces are ignored):
//   X = accent   x = normal hit   o = ghost note   . = rest

export const DRUMS = {
  kick: { note: 36, label: 'Kick' },
  snare: { note: 38, label: 'Snare' },
  stick: { note: 37, label: 'Side stick' },
  clap: { note: 39, label: 'Clap' },
  hat: { note: 42, label: 'Hi-hat' },
  pedal: { note: 44, label: 'Pedal hat' },
  open: { note: 46, label: 'Open hat' },
  tomH: { note: 50, label: 'High tom' },
  tomM: { note: 47, label: 'Mid tom' },
  tomL: { note: 45, label: 'Low tom' },
  floor: { note: 41, label: 'Floor tom' },
  crash: { note: 49, label: 'Crash' },
  ride: { note: 51, label: 'Ride' },
  bell: { note: 53, label: 'Ride bell' },
  tamb: { note: 54, label: 'Tambourine' },
};

const VELOCITY = { X: 118, x: 92, o: 42 };

export const GROOVES = [
  {
    id: 'shuffle',
    name: 'Gospel Shuffle',
    feel: '12/8 shuffle',
    about: 'The swung triplet feel behind a lot of traditional gospel. A ghost note on the last triplet leans into each backbeat.',
    bpm: 88,
    beatsPerBar: 4,
    stepsPerBeat: 3,
    main: {
      hat: 'X.x x.x X.x x.x',
      snare: '..o X.o ..o X..',
      kick: 'x.. ..x x.. ...',
    },
    fill: {
      snare: 'oox xxX ... ...',
      tomH: '... ... xxx ...',
      tomL: '... ... ... x.X',
      kick: 'x.. ... ... ..x',
    },
  },
  {
    id: 'praise',
    name: 'Praise Break',
    feel: 'Fast 4/4, snare on the "and"',
    about: 'Kick on every beat and the snare answering on every "and". This is the shout music that keeps the church on its feet.',
    bpm: 144,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    main: {
      hat: 'x.x. x.x. x.x. x.x.',
      snare: 'o.X. o.X. o.X. o.Xo',
      kick: 'X... X... X... X...',
    },
    fill: {
      snare: 'oooo xxxx xxxx XXXX',
      kick: 'X... X... X... X...',
    },
  },
  {
    id: 'ballad68',
    name: '6/8 Worship Ballad',
    feel: '6/8, two big beats per bar',
    about: 'Slow and wide: kick on 1, snare on 4, eighth notes on the hat. Count it "1-2-3-4-5-6".',
    bpm: 50,
    beatsPerBar: 2,
    stepsPerBeat: 6,
    main: {
      hat: 'x.x.x. x.x.x.',
      snare: '...... X...o.',
      kick: 'X..... ..x...',
    },
    fill: {
      tomH: 'xxxx.. ......',
      tomM: '....xx xx....',
      tomL: '...... ..xxXX',
      kick: 'X..... ......',
    },
  },
  {
    id: 'halftime',
    name: 'Half-Time Worship',
    feel: '4/4, snare on 3',
    about: 'The snare lands on beat 3, so the song feels half as fast while the hat keeps moving. A staple of modern worship builds.',
    bpm: 72,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    main: {
      hat: 'x.x. x.x. x.x. x.x.',
      snare: '.... .... X... ...o',
      kick: 'X... ..x. ..X. ....',
    },
    fill: {
      snare: '.... .... xxxx ....',
      tomH: '.... .... .... xx..',
      tomL: '.... .... .... ..xX',
      kick: 'X... .... .... ....',
    },
  },
  {
    id: 'neosoul',
    name: 'Neo-Soul Pocket',
    feel: 'Swung 16ths, laid back',
    about: 'Lazy, swung sixteenths with ghost notes. Beat 4 layers side stick and snare together for that fat "splat".',
    bpm: 84,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    swing: 0.55,
    main: {
      hat: 'x.xo x.xo x.xo x.xo',
      snare: '.... X..o .o.. X..o',
      stick: '.... .... .... X...',
      kick: 'X... ...x ..x. ....',
    },
    fill: {
      hat: 'x.xo x.xo .... ....',
      snare: '.... X..o o.ox x.xX',
      tomM: '.... .... .... .x..',
      kick: 'X... ...x .... ....',
    },
  },
  {
    id: 'swing',
    name: 'Church Swing',
    feel: 'Triplet swing on the ride',
    about: 'The traditional organ-and-drums swing: "ding, ding-da, ding, ding-da" on the ride, pedal hat on 2 and 4, feathered kick.',
    bpm: 126,
    beatsPerBar: 4,
    stepsPerBeat: 3,
    main: {
      ride: 'x.. x.x x.. x.x',
      pedal: '... x.. ... x..',
      snare: '..o X.. ..o X..',
      kick: 'o.. o.. o.. o..',
    },
    fill: {
      snare: 'xxx xxx xxx XXX',
      kick: 'x.. ... ... ...',
    },
  },
  {
    id: 'contemporary',
    name: 'Contemporary 16ths',
    feel: 'Driving 4/4 sixteenths',
    about: 'Busy sixteenths on the hat with a syncopated kick and an open hat lifting into the next bar. Choir and band music.',
    bpm: 100,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    main: {
      hat: 'Xxxx Xxxx Xxxx Xx.x',
      open: '.... .... .... ..x.',
      snare: '.... X..o .... X.o.',
      kick: 'X..x ..X. ..X. .x..',
    },
    fill: {
      snare: 'o.xx o.xx .... ....',
      tomH: '.... .... xx.. ....',
      tomM: '.... .... ..xx ....',
      tomL: '.... .... .... xxXX',
      kick: 'X... X... X... X...',
    },
  },
  {
    id: 'twostep',
    name: 'Gospel Two-Step',
    feel: 'Up-tempo quartet feel',
    about: 'Kick on 1 and 3, snare and tambourine on 2 and 4. The bright two-beat feel of quartet and choir up-tempo songs.',
    bpm: 160,
    beatsPerBar: 4,
    stepsPerBeat: 2,
    main: {
      hat: 'xx xx xx xx',
      tamb: '.. x. .. x.',
      snare: '.. X. .. X.',
      kick: 'X. .. X. ..',
    },
    fill: {
      snare: 'xx xx XX XX',
      kick: 'X. .. .. ..',
    },
  },
];

/** Turn pattern strings into per-step hit lists. */
export function compilePattern(pattern, steps) {
  const hits = Array.from({ length: steps }, () => []);
  const rows = [];
  for (const [drum, str] of Object.entries(pattern)) {
    const cells = str.replace(/\s+/g, '');
    if (cells.length !== steps) throw new Error(`Pattern row "${drum}" has ${cells.length} steps, expected ${steps}`);
    const row = { drum, label: DRUMS[drum].label, note: DRUMS[drum].note, cells: [] };
    [...cells].forEach((c, i) => {
      const vel = VELOCITY[c] || 0;
      row.cells.push(vel);
      if (vel) hits[i].push({ note: DRUMS[drum].note, vel });
    });
    rows.push(row);
  }
  return { hits, rows };
}

export function compileGroove(g) {
  const steps = g.beatsPerBar * g.stepsPerBeat;
  return { ...g, steps, main: compilePattern(g.main, steps), fill: compilePattern(g.fill, steps) };
}

const LOOKAHEAD = 0.12;

/**
 * Plays a groove in a loop against the AudioContext clock.
 * hooks: { now(), hit(note, vel, at), step(step, isFill, at) }
 */
export class GroovePlayer {
  constructor(hooks) {
    this.hooks = hooks;
    this.groove = compileGroove(GROOVES[0]);
    this.pending = null;
    this.bpm = this.groove.bpm;
    this.intensity = 'full'; // 'full' | 'light'
    this.autoFill = 0; // fill every N bars (0 = off)
    this.playing = false;
    this.timer = null;
  }

  setGroove(id) {
    const g = GROOVES.find((x) => x.id === id) || GROOVES[0];
    const compiled = compileGroove(g);
    if (this.playing) this.pending = compiled;
    else this.groove = compiled;
    return compiled;
  }

  get stepDur() {
    return 60 / this.bpm / this.groove.stepsPerBeat;
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.bar = 0;
    this.inFill = false;
    this.fillQueued = false;
    this.crashNext = false;
    this.nextTime = this.hooks.now() + 0.06;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    if (this.pending) {
      this.groove = this.pending;
      this.pending = null;
    }
  }

  /** Play a fill in place of the next bar. */
  fill() {
    if (this.playing) this.fillQueued = true;
  }

  tick() {
    if (!this.playing) return;
    const horizon = this.hooks.now() + LOOKAHEAD;
    while (this.nextTime < horizon) {
      if (this.step === 0) this.startBar();
      const g = this.groove;
      const pattern = this.inFill ? g.fill : g.main;
      let at = this.nextTime;
      if (g.swing && g.stepsPerBeat === 4 && this.step % 2 === 1) at += g.swing * this.stepDur * 0.5;
      for (const h of pattern.hits[this.step]) {
        let vel = h.vel;
        if (this.intensity === 'light') {
          if (vel < 60) continue;
          vel = Math.round(vel * 0.72);
        }
        this.hooks.hit(h.note, vel, at);
      }
      if (this.step === 0 && this.crashNext) {
        this.hooks.hit(DRUMS.crash.note, this.intensity === 'light' ? 80 : 110, at);
        this.crashNext = false;
      }
      this.hooks.step(this.step, this.inFill, at);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % g.steps;
      if (this.step === 0) this.bar++;
    }
  }

  startBar() {
    if (this.inFill) this.crashNext = true;
    if (this.pending) {
      this.groove = this.pending;
      this.pending = null;
    }
    const auto = this.autoFill > 0 && this.bar > 0 && (this.bar + 1) % this.autoFill === 0;
    this.inFill = this.fillQueued || auto;
    this.fillQueued = false;
  }
}
