// MIDI song playback: lookahead scheduling against the AudioContext clock,
// tempo scaling, transposition, A/B looping, and a "follow media" mode that
// slaves MIDI to an audio/video element's clock (for synced lessons).

const LOOKAHEAD = 0.12; // seconds of audio scheduled ahead
const INTERVAL = 25; // scheduler period, ms
const CHORD_WINDOW = 0.06; // target notes this close together are one chord to wait for

export class Player {
  /**
   * hooks: { now(), noteOn(ch, note, vel, at), noteOff(ch, note, at), control(ch, cc, v, at),
   *          program(ch, p, at), pitch(ch, v, at), allNotesOff(at), onEnd(),
   *          span?(fromSong, toSong, ctxAt) }
   *
   * Learn mode: set `learn = { isTarget(e) }`. Target notes are never sounded; the
   * player stops at each one (with any target notes within CHORD_WINDOW, as a
   * chord) and calls hooks.onWait(notes) until resumeWait() is called.
   *
   * `span` is called for each stretch of song time as it gets scheduled, with a
   * function mapping song seconds to AudioContext time. Spans arrive in playback
   * order, and a loop wrap or seek starts a new run of spans.
   */
  constructor(hooks) {
    this.hooks = hooks;
    this.song = null;
    this.events = [];
    this.idx = 0;
    this.playing = false;
    this.rate = 1;
    this.transpose = 0;
    this.loop = { enabled: false, a: 0, b: 0 };
    this.position = 0; // song seconds while paused
    this.anchor = null; // { ctx, song } while playing
    this.prevAnchor = null;
    this.active = new Map(); // `${ch}:${note}` -> sounding (transposed) note
    this.follow = false;
    this.lastFollow = 0;
    this.scheduledTo = 0; // song time already handed to hooks.span
    this.learn = null; // { isTarget(e) } while learning a part
    this.waiting = null; // { time, notes } while waiting for the player
    this.skipUntil = -1; // targets up to this time were already played
    this.timer = null;
  }

  load(song) {
    this.stop();
    this.song = song;
    this.events = song ? song.events : [];
    this.position = 0;
    this.idx = 0;
    this.chase(0);
  }

  get duration() {
    return this.song ? this.song.duration : 0;
  }

  get time() {
    if (!this.playing || this.follow) return this.position;
    const now = this.hooks.now();
    let a = this.anchor;
    if (now < a.ctx) {
      if (!this.prevAnchor) return a.song;
      a = this.prevAnchor;
    }
    return Math.max(0, a.song + (now - a.ctx) * this.rate);
  }

  songAt(ctxTime) {
    return this.anchor.song + (ctxTime - this.anchor.ctx) * this.rate;
  }

  ctxAt(songTime) {
    return this.anchor.ctx + (songTime - this.anchor.song) / this.rate;
  }

  indexAt(t) {
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].time < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Apply program/controller state up to time t without sounding notes. */
  chase(t) {
    const now = this.hooks.now();
    for (let i = 0; i < this.events.length && this.events[i].time < t; i++) {
      const e = this.events[i];
      if (e.type === 'program') this.hooks.program(e.ch, e.program, now);
      else if (e.type === 'cc' && e.cc !== 64 && e.cc !== 66 && e.cc !== 67) this.hooks.control(e.ch, e.cc, e.value, now);
    }
  }

  play() {
    if (!this.song || this.playing) return;
    if (this.position >= this.duration - 0.05) this.position = this.loop.enabled ? this.loop.a : 0;
    this.playing = true;
    const now = this.hooks.now();
    this.anchor = { ctx: now + 0.05, song: this.position };
    this.prevAnchor = null;
    this.idx = this.indexAt(this.position);
    this.scheduledTo = this.position;
    if (!this.follow) {
      this.tick();
      this.timer = setInterval(() => this.tick(), INTERVAL);
    }
  }

  pause() {
    this.waiting = null;
    this.skipUntil = -1;
    if (!this.playing) return;
    this.position = this.time;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    this.silence(this.hooks.now());
  }

  stop() {
    this.pause();
    this.position = this.loop.enabled ? this.loop.a : 0;
    this.idx = this.indexAt(this.position);
  }

  seek(t) {
    t = Math.max(0, Math.min(t, this.duration));
    const wasPlaying = this.playing && !this.follow;
    if (wasPlaying) {
      this.pause();
      this.position = t;
      this.chase(t);
      this.play();
    } else {
      this.waiting = null;
      this.skipUntil = -1;
      this.silence(this.hooks.now());
      this.position = t;
      this.lastFollow = t;
      this.idx = this.indexAt(t);
      this.chase(t);
    }
  }

  setRate(rate) {
    if (this.playing && !this.follow) {
      const now = this.hooks.now();
      const song = this.time;
      this.prevAnchor = null;
      this.anchor = { ctx: now, song };
    }
    this.rate = rate;
  }

  silence(at) {
    this.active.clear();
    this.hooks.allNotesOff(at);
  }

  dispatch(e, at) {
    const h = this.hooks;
    if (this.learn && (e.type === 'on' || e.type === 'off') && this.learn.isTarget(e)) return; // you play this part
    switch (e.type) {
      case 'on': {
        const note = e.ch === 9 ? e.note : e.note + this.transpose;
        if (note < 0 || note > 127) return;
        this.active.set(`${e.ch}:${e.note}`, note);
        h.noteOn(e.ch, note, e.vel, at);
        break;
      }
      case 'off': {
        const key = `${e.ch}:${e.note}`;
        if (!this.active.has(key)) return;
        h.noteOff(e.ch, this.active.get(key), at);
        this.active.delete(key);
        break;
      }
      case 'cc':
        h.control(e.ch, e.cc, e.value, at);
        break;
      case 'program':
        h.program(e.ch, e.program, at);
        break;
      case 'pitch':
        h.pitch(e.ch, e.value, at);
        break;
      default:
        break;
    }
  }

  tick() {
    if (!this.playing || this.follow) return;
    const horizon = this.hooks.now() + LOOKAHEAD;
    for (let guard = 0; guard < 16; guard++) {
      const songHorizon = this.songAt(horizon);
      const loopOn = this.loop.enabled && this.loop.b > this.loop.a + 0.05;
      const wraps = loopOn && songHorizon >= this.loop.b && this.anchor.song < this.loop.b;
      const limit = wraps ? this.loop.b : songHorizon;
      while (this.idx < this.events.length && this.events[this.idx].time < limit) {
        const e = this.events[this.idx];
        if (this.learn && e.type === 'on' && e.time > this.skipUntil && this.learn.isTarget(e)) {
          this.waitAt(e.time);
          return;
        }
        this.idx++;
        this.dispatch(e, Math.max(this.hooks.now(), this.ctxAt(e.time)));
      }
      if (limit > this.scheduledTo) {
        const anchor = this.anchor;
        const rate = this.rate;
        this.hooks.span?.(this.scheduledTo, limit, (t) => anchor.ctx + (t - anchor.song) / rate);
        this.scheduledTo = limit;
      }
      if (wraps) {
        const atB = this.ctxAt(this.loop.b);
        this.silence(atB);
        this.prevAnchor = this.anchor;
        this.anchor = { ctx: atB, song: this.loop.a };
        this.idx = this.indexAt(this.loop.a);
        this.scheduledTo = this.loop.a;
        this.skipUntil = -1;
        continue;
      }
      if (!loopOn && this.idx >= this.events.length && this.time >= this.duration) {
        this.pause();
        this.position = 0;
        this.idx = 0;
        this.hooks.onEnd();
      }
      break;
    }
  }

  // ---- Learn mode ---------------------------------------------------------

  /** Stop the clock at `time` and wait for the target notes there. Sounding notes ring on. */
  waitAt(time) {
    const notes = [];
    for (let j = this.idx; j < this.events.length && this.events[j].time <= time + CHORD_WINDOW; j++) {
      const e = this.events[j];
      if (e.type === 'on' && this.learn.isTarget(e)) notes.push(e.ch === 9 ? e.note : e.note + this.transpose);
    }
    clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.position = time;
    this.scheduledTo = time;
    this.waiting = { time, notes };
    this.hooks.onWait?.(notes, time);
  }

  /** The player hit the right notes: carry on from where we stopped. */
  resumeWait() {
    if (!this.waiting) return;
    this.skipUntil = this.waiting.time + CHORD_WINDOW;
    this.waiting = null;
    this.play();
  }

  /** Upcoming target notes after `time` (for a "next up" preview). */
  nextTargets(time) {
    if (!this.learn) return [];
    let i = this.indexAt(time + CHORD_WINDOW + 1e-6);
    while (i < this.events.length && !(this.events[i].type === 'on' && this.learn.isTarget(this.events[i]))) i++;
    if (i >= this.events.length) return [];
    const t = this.events[i].time;
    const out = [];
    for (; i < this.events.length && this.events[i].time <= t + CHORD_WINDOW; i++) {
      const e = this.events[i];
      if (e.type === 'on' && this.learn.isTarget(e)) out.push(e.ch === 9 ? e.note : e.note + this.transpose);
    }
    return out;
  }

  // ---- Follow mode: MIDI driven by an external media clock ---------------

  setFollow(on) {
    if (this.playing) this.pause();
    this.follow = on;
  }

  /** Call every animation frame with the media element's current time. */
  syncTo(t, playing) {
    if (!this.follow || !this.song) return;
    const now = this.hooks.now();
    const wasPlaying = this.followPlaying;
    this.followPlaying = playing;
    if (!playing) {
      if (wasPlaying || Math.abs(t - this.lastFollow) > 0.001) {
        this.silence(now);
        this.idx = this.indexAt(t);
      }
      this.lastFollow = t;
      this.position = t;
      this.scheduledTo = t;
      return;
    }
    if (t < this.lastFollow - 0.05 || t > this.lastFollow + 1) {
      this.silence(now);
      this.idx = this.indexAt(t);
      this.chase(t);
      this.scheduledTo = t;
    }
    while (this.idx < this.events.length && this.events[this.idx].time <= t) {
      this.dispatch(this.events[this.idx++], now);
    }
    // Look a little ahead of the media clock so locked grooves stay tight.
    const ahead = t + LOOKAHEAD * this.rate;
    if (ahead > this.scheduledTo) {
      const rate = this.rate;
      this.hooks.span?.(Math.max(this.scheduledTo, t), ahead, (sec) => now + (sec - t) / rate);
      this.scheduledTo = ahead;
    }
    this.lastFollow = t;
    this.position = t;
  }
}
