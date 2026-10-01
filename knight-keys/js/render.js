// Canvas renderers: piano keyboard, grand staff, and wheels/pedals.
import { isBlack, spellNote, keyAccidentals, SHARP, FLAT, NATURAL } from './theory.js';

/** Size a canvas to its CSS box at device pixel ratio; returns a 2D context in CSS px. */
export function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: canvas.clientWidth, h: canvas.clientHeight };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.closePath();
}

function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

function mix(hex, base, t) {
  const p = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  };
  try {
    const a = p(hex);
    const b = p(base);
    return `rgb(${a.map((c, i) => Math.round(c * t + b[i] * (1 - t))).join(',')})`;
  } catch {
    return hex;
  }
}

// ---- Keyboard ----------------------------------------------------------------

const BLACK_OFFSET = { 1: -0.12, 3: 0.12, 6: -0.15, 8: 0, 10: 0.15 };

export class KeyboardView {
  constructor(canvas) {
    this.canvas = canvas;
    this.lo = 21;
    this.hi = 108;
    this.style = 'vector';
    this.cMarkers = true;
    this.labels = 'none'; // 'none' | 'names' | 'solfege'
    this.split = null; // { point, leftColor, rightColor } when enabled
    this.keyState = () => null; // note -> { color, faded } | null
    this.label = () => '';
    this.keys = [];
  }

  setRange(lo, hi) {
    if (isBlack(lo)) lo--;
    if (isBlack(hi)) hi++;
    this.lo = Math.max(0, lo);
    this.hi = Math.min(127, hi);
  }

  layout(w, h) {
    const whites = [];
    for (let n = this.lo; n <= this.hi; n++) if (!isBlack(n)) whites.push(n);
    const ww = w / whites.length;
    const bw = ww * 0.6;
    const bh = h * 0.62;
    this.keys = [];
    const whiteX = new Map();
    whites.forEach((n, i) => {
      whiteX.set(n, i * ww);
      this.keys.push({ note: n, black: false, x: i * ww, y: 0, w: ww, h });
    });
    for (let n = this.lo; n <= this.hi; n++) {
      if (!isBlack(n)) continue;
      const right = whiteX.get(n + 1);
      if (right === undefined) continue;
      const x = right - bw / 2 + BLACK_OFFSET[n % 12] * bw;
      this.keys.push({ note: n, black: true, x, y: 0, w: bw, h: bh });
    }
    this.ww = ww;
  }

  noteAt(x, y) {
    for (let i = this.keys.length - 1; i >= 0; i--) {
      const k = this.keys[i];
      // Black keys are stored last, so they win over the white keys beneath them.
      if (x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h) return k.note;
    }
    return null;
  }

  draw(colors) {
    const { ctx, w, h } = fitCanvas(this.canvas);
    this.layout(w, h);
    const real = this.style === 'real';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bed || '#111';
    ctx.fillRect(0, 0, w, h);

    const font = Math.max(8, Math.min(13, this.ww * 0.45));
    for (const k of this.keys) {
      const st = this.keyState(k.note);
      const inset = k.black ? 0 : 0.5;
      const x = k.x + inset;
      const kw = k.w - inset * 2;
      if (!k.black) {
        let fill = '#f6f5f0';
        if (st) fill = st.faded ? mix(st.color, '#f6f5f0', 0.45) : st.color;
        if (real) {
          const g = ctx.createLinearGradient(0, 0, 0, k.h);
          g.addColorStop(0, st ? fill : '#e9e7e0');
          g.addColorStop(0.85, fill);
          g.addColorStop(1, st ? shade(fill, -0.2) : '#d6d3ca');
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = fill;
        }
        roundRect(ctx, x, k.y + (real && st ? 1.5 : 0), kw, k.h - (real && st ? 1.5 : 0), Math.min(5, kw * 0.18));
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    for (const k of this.keys) {
      if (!k.black) continue;
      const st = this.keyState(k.note);
      let fill = '#1b1b1f';
      if (st) fill = st.faded ? mix(st.color, '#1b1b1f', 0.55) : shade(st.color, -0.12);
      if (real) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        roundRect(ctx, k.x + 2, k.y, k.w, k.h + 2, 3);
        ctx.fill();
        const g = ctx.createLinearGradient(k.x, 0, k.x + k.w, 0);
        g.addColorStop(0, shade(fill, 0.18));
        g.addColorStop(0.5, fill);
        g.addColorStop(1, shade(fill, -0.3));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = fill;
      }
      roundRect(ctx, k.x, k.y, k.w, k.h, Math.min(3, k.w * 0.15));
      ctx.fill();
      if (real && !st) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        roundRect(ctx, k.x + k.w * 0.15, k.y, k.w * 0.7, k.h * 0.9, 2);
        ctx.fill();
      }
    }

    // Felt strip
    ctx.fillStyle = colors.felt || '#7a1f2b';
    ctx.fillRect(0, 0, w, Math.max(2, h * 0.025));

    // Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const k of this.keys) {
      const st = this.keyState(k.note);
      const lbl = st && this.labels !== 'none' ? this.label(k.note) : '';
      if (lbl) {
        ctx.font = `600 ${font}px system-ui, sans-serif`;
        ctx.fillStyle = k.black ? '#fff' : '#111';
        ctx.fillText(lbl, k.x + k.w / 2, k.y + k.h - (k.black ? 4 : font + 8));
      }
      if (this.cMarkers && k.note % 12 === 0) {
        ctx.font = `${font}px system-ui, sans-serif`;
        ctx.fillStyle = st && !st.faded ? '#111' : '#8a8a8a';
        ctx.fillText('C' + (Math.floor(k.note / 12) - 1), k.x + k.w / 2, k.y + k.h - 3);
      }
    }

    if (this.split) {
      const key = this.keys.find((k) => k.note === this.split.point) || this.keys.find((k) => k.note === this.split.point + 1);
      if (key) {
        const x = key.black ? key.x + key.w / 2 : key.x;
        ctx.fillStyle = this.split.leftColor;
        ctx.fillRect(0, h - 4, x, 4);
        ctx.fillStyle = this.split.rightColor;
        ctx.fillRect(x, h - 4, w - x, 4);
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

// ---- Grand staff -----------------------------------------------------------

const TREBLE_BOTTOM = 37; // E4
const BASS_BOTTOM = 25; // G2
const SHARP_STEPS = [45, 42, 46, 43, 40, 44, 41];
const FLAT_STEPS = [41, 44, 40, 43, 39, 42, 38];
const MUSIC_FONT = '"Noto Music", "Bravura Text", "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", serif';

/**
 * notes: [{ midi, color }]. opts: { sf, spelling, splitPoint, fg, bg }
 */
export function drawStaff(canvas, notes, opts) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const fg = opts.fg || '#ddd';
  const gap = Math.max(5, Math.min(18, h / 19, w / 26));
  const total = gap * 12; // treble(4) + space(4) + bass(4)
  const top = (h - total) / 2;
  const trebleBottom = top + gap * 4;
  const bassBottom = top + gap * 12;
  const yT = (s) => trebleBottom - ((s - TREBLE_BOTTOM) * gap) / 2;
  const yB = (s) => bassBottom - ((s - BASS_BOTTOM) * gap) / 2;
  const x0 = Math.max(8, gap);
  const x1 = w - Math.max(8, gap);

  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 5; i++) {
    for (const y of [trebleBottom - i * gap, bassBottom - i * gap]) {
      ctx.beginPath();
      ctx.moveTo(x0, Math.round(y) + 0.5);
      ctx.lineTo(x1, Math.round(y) + 0.5);
      ctx.stroke();
    }
  }
  // System barlines
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, trebleBottom - 4 * gap);
  ctx.lineTo(x0, bassBottom);
  ctx.moveTo(x1, trebleBottom - 4 * gap);
  ctx.lineTo(x1, bassBottom);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Clefs
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${gap * 4.2}px ${MUSIC_FONT}`;
  ctx.fillText('\u{1D11E}', x0 + gap * 0.4, yT(39) + gap * 1.05);
  ctx.font = `${gap * 3.4}px ${MUSIC_FONT}`;
  ctx.fillText('\u{1D122}', x0 + gap * 0.5, yB(31) + gap * 1.15);

  // Key signature
  const sf = opts.sf || 0;
  let x = x0 + gap * 3.6;
  ctx.font = `${gap * 2.2}px ${MUSIC_FONT}`;
  ctx.textBaseline = 'middle';
  const sigSteps = sf > 0 ? SHARP_STEPS.slice(0, sf) : FLAT_STEPS.slice(0, -sf);
  sigSteps.forEach((s, i) => {
    const glyph = sf > 0 ? SHARP : FLAT;
    const dy = sf > 0 ? 0 : -gap * 0.35;
    ctx.fillText(glyph, x + i * gap * 0.9, yT(s) + dy);
    ctx.fillText(glyph, x + i * gap * 0.9, yB(s - 14) + dy);
  });
  x += sigSteps.length * gap * 0.9;

  // Notes
  const split = opts.splitPoint ?? 60;
  const acc = keyAccidentals(sf);
  const cx = Math.max(x + gap * 4, (x0 + x1) / 2);
  const rx = gap * 0.62;
  const ry = gap * 0.45;

  for (const clef of ['treble', 'bass']) {
    const y = clef === 'treble' ? yT : yB;
    const bottom = clef === 'treble' ? TREBLE_BOTTOM : BASS_BOTTOM;
    const topLine = bottom + 8;
    const group = notes
      .filter((n) => (clef === 'treble' ? n.midi >= split : n.midi < split))
      .map((n) => ({ ...n, sp: spellNote(n.midi, sf, opts.spelling) }))
      .sort((a, b) => a.sp.step - b.sp.step || a.midi - b.midi);
    if (!group.length) continue;

    // Ledger lines
    const minStep = group[0].sp.step;
    const maxStep = group[group.length - 1].sp.step;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.2;
    const ledger = (s) => {
      ctx.beginPath();
      ctx.moveTo(cx - rx * 1.9, y(s));
      ctx.lineTo(cx + rx * 3.6, y(s));
      ctx.stroke();
    };
    for (let s = bottom - 2; s >= minStep; s -= 2) ledger(s);
    for (let s = topLine + 2; s <= maxStep; s += 2) ledger(s);

    // Seconds get pushed to the right of the stem side.
    let prev = null;
    for (const n of group) {
      n.shift = prev && n.sp.step - prev.sp.step <= 1 && !prev.shift ? 1 : 0;
      prev = n;
    }
    // Accidentals, staggered into columns to avoid collisions.
    const columns = [];
    for (let i = group.length - 1; i >= 0; i--) {
      const n = group[i];
      const keyAlter = acc[n.sp.letter];
      if (n.sp.alter === keyAlter) continue;
      n.accGlyph = n.sp.alter === 0 ? NATURAL : n.sp.alter > 0 ? SHARP.repeat(n.sp.alter) : FLAT.repeat(-n.sp.alter);
      let col = 0;
      while (columns[col] !== undefined && columns[col] - n.sp.step < 6) col++;
      columns[col] = n.sp.step;
      n.accCol = col;
    }

    for (const n of group) {
      const ny = y(n.sp.step);
      const nx = cx + n.shift * rx * 1.9;
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(-0.35);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();
      ctx.restore();
      if (n.accGlyph) {
        ctx.fillStyle = fg;
        ctx.font = `${gap * 2}px ${MUSIC_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ax = cx - rx * 2 - n.accCol * gap * 1.1;
        ctx.fillText(n.accGlyph, ax, ny + (n.sp.alter < 0 ? -gap * 0.3 : 0));
      }
    }
  }
}

// ---- Wheels & pedals ---------------------------------------------------------

/** state: { bend: -1..1, mod: 0..1, sustain, sostenuto, soft }; show: { wheels, pedals } */
export function drawControllers(canvas, state, show, accent, fg) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const parts = (show.wheels ? 2 : 0) + (show.pedals ? 3 : 0);
  if (!parts) return;
  const pad = 8;
  const slot = (w - pad * 2) / parts;
  let i = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '11px system-ui, sans-serif';

  const wheel = (label, value, centered) => {
    const cx = pad + slot * (i + 0.5);
    const ww = Math.min(slot * 0.55, 34);
    const top = pad;
    const bot = h - 22;
    const hh = bot - top;
    ctx.fillStyle = '#0d0d10';
    roundRect(ctx, cx - ww / 2 - 4, top - 4, ww + 8, hh + 8, 6);
    ctx.fill();
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#2a2a30');
    g.addColorStop(0.5, '#4a4a52');
    g.addColorStop(1, '#2a2a30');
    ctx.fillStyle = g;
    roundRect(ctx, cx - ww / 2, top, ww, hh, 4);
    ctx.fill();
    // Ridges scroll with the value for an animated look.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    const offset = (centered ? value : value * 2 - 1) * hh * 0.25;
    for (let r = -6; r <= 6; r++) {
      const ry = top + hh / 2 + r * (hh / 12) + offset;
      if (ry < top + 2 || ry > bot - 2) continue;
      ctx.beginPath();
      ctx.moveTo(cx - ww / 2 + 2, ry);
      ctx.lineTo(cx + ww / 2 - 2, ry);
      ctx.stroke();
    }
    const pos = centered ? top + hh / 2 - (value * hh) / 2 : bot - value * hh;
    ctx.fillStyle = accent;
    ctx.fillRect(cx - ww / 2, Math.max(top, Math.min(bot - 4, pos - 2)), ww, 4);
    ctx.fillStyle = fg;
    ctx.fillText(label, cx, h - 4);
    i++;
  };

  const pedal = (label, down) => {
    const cx = pad + slot * (i + 0.5);
    const pw = Math.min(slot * 0.7, 46);
    const top = pad + 6;
    const bot = h - 22;
    ctx.save();
    ctx.translate(cx, bot);
    const tilt = down ? 0.92 : 1;
    ctx.scale(1, tilt);
    const g = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
    const base = down ? accent : '#b9b6ad';
    g.addColorStop(0, shade(base, -0.3));
    g.addColorStop(0.5, base);
    g.addColorStop(1, shade(base, -0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    const ph = bot - top;
    ctx.moveTo(-pw * 0.32, -ph);
    ctx.lineTo(pw * 0.32, -ph);
    ctx.quadraticCurveTo(pw / 2, -ph * 0.3, pw / 2, 0);
    ctx.lineTo(-pw / 2, 0);
    ctx.quadraticCurveTo(-pw / 2, -ph * 0.3, -pw * 0.32, -ph);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = fg;
    ctx.fillText(label, cx, h - 4);
    i++;
  };

  if (show.wheels) {
    wheel('Pitch', state.bend, true);
    wheel('Mod', state.mod, false);
  }
  if (show.pedals) {
    pedal('Soft', state.soft);
    pedal('Sost.', state.sostenuto);
    pedal('Sustain', state.sustain);
  }
}
