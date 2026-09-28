// Minimal Logic Pro Scripter API mock for offline testing of W.O.M.P. scripts.
const fs = require("fs");
const vm = require("vm");

function load(file, opts = {}) {
  const clock = { now: 0 };
  const out = [];     // { t, type, pitch, velocity, value, channel }
  const params = Object.assign({}, opts.params || {});
  const timing = Object.assign({ playing: false, tempo: 90 }, opts.timing || {});

  class Event {
    constructor(src) {
      this.channel = 1;
      if (src) for (const k of Object.keys(src)) this[k] = src[k];
    }
    _rec(t) { out.push(Object.assign({ t, type: this.constructor.name }, this)); }
    send() { this._rec(clock.now); }
    sendAfterMilliseconds(ms) { this._rec(clock.now + ms); }
  }
  class NoteOn extends Event { constructor(s) { super(s); if (this.velocity === undefined) this.velocity = 100; } }
  class NoteOff extends Event { constructor(s) { super(s); this.velocity = 0; } }
  class PitchBend extends Event { constructor(s) { super(s); if (this.value === undefined) this.value = 0; } }
  class ControlChange extends Event {}

  const ctx = {
    Event, NoteOn, NoteOff, PitchBend, ControlChange, Math, console,
    Date: { now: () => clock.now },
    Trace: () => {},
    GetTimingInfo: () => timing,
  };
  ctx.GetParameter = (name) => {
    if (name in params) return params[name];
    const p = ctx.PluginParameters.find((x) => x.name === name);
    if (!p) throw new Error("Unknown parameter: " + name);
    return p.defaultValue;
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });

  return {
    ctx, clock, out, params, timing,
    on(pitch, velocity = 100, extra = {}) { ctx.HandleMIDI(Object.assign(new NoteOn({ pitch, velocity }), extra)); },
    off(pitch, extra = {}) { ctx.HandleMIDI(Object.assign(new NoteOff({ pitch }), extra)); },
    advance(ms, step = 5) {
      for (let i = 0; i < ms; i += step) { clock.now += step; if (ctx.ProcessMIDI) ctx.ProcessMIDI(); }
    },
    notes(type) { return out.filter((e) => e.type === type); },
  };
}
module.exports = { load };
