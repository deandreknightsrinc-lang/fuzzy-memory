// Live puppeteering: a person drives a Knight Lyfe character live. Webcam face
// tracking (MediaPipe, in the browser) moves the head, eyes, brows and mouth;
// the microphone moves the mouth by voice; keys trigger expressions and
// gestures. The puppet screen (puppet.html) shows the character on a green
// screen for OBS, a projector or a livestream.

/** A resting face: every value 0 (turn/nod/brow -1..1, tilt in degrees). */
export const REST_POSE = { mouth: 0, smile: 0, blinkL: 0, blinkR: 0, brow: 0, turn: 0, nod: 0, tilt: 0 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * MediaPipe face blendshapes ([{ categoryName, score }]) -> the character's face.
 * Your left eye drives the character's right eye, like a mirror, so it feels
 * natural while you watch yourself.
 */
export function poseFromBlendshapes(categories) {
  const b = Object.fromEntries((categories || []).map((c) => [c.categoryName, c.score]));
  const g = (k) => b[k] || 0;
  const browUp = Math.max(g('browInnerUp'), (g('browOuterUpLeft') + g('browOuterUpRight')) / 2);
  const browDown = (g('browDownLeft') + g('browDownRight')) / 2;
  return {
    mouth: clamp(g('jawOpen') * 1.6 + g('mouthFunnel') * 0.4, 0, 1),
    smile: clamp(((g('mouthSmileLeft') + g('mouthSmileRight')) / 2) * 1.4, 0, 1),
    blinkL: clamp((g('eyeBlinkRight') - 0.15) / 0.55, 0, 1),
    blinkR: clamp((g('eyeBlinkLeft') - 0.15) / 0.55, 0, 1),
    brow: clamp(browUp * 1.6 - browDown * 1.2, -1, 1),
  };
}

/**
 * Head angles (degrees) from MediaPipe's 4x4 facial transformation matrix
 * (column-major, 16 numbers): yaw = turning, pitch = nodding, roll = tilting.
 */
export function headAngles(m) {
  if (!m || m.length < 11) return { yaw: 0, pitch: 0, roll: 0 };
  // Rotation part, row-major: r[row][col] = m[col * 4 + row].
  const r = (row, col) => m[col * 4 + row];
  const deg = 180 / Math.PI;
  return {
    yaw: Math.asin(clamp(-r(2, 0), -1, 1)) * deg,
    pitch: Math.atan2(r(2, 1), r(2, 2)) * deg,
    roll: Math.atan2(r(1, 0), r(0, 0)) * deg,
  };
}

/**
 * Head angles -> the character's head, mirrored like the camera preview: lean or
 * turn to your left and it leans/turns to the left of the screen. (MediaPipe's
 * axes: x to the right of the camera image, y up, z toward the camera.)
 */
export function poseFromHead({ yaw, pitch, roll }) {
  return { turn: clamp(-yaw / 30, -1, 1), nod: clamp(pitch / 25, -1, 1), tilt: clamp(roll, -25, 25) };
}

/** Microphone loudness (RMS of the samples) -> how open the mouth is. */
export function mouthFromLevel(rms, { gate = 0.012, full = 0.12 } = {}) {
  return clamp((rms - gate) / (full - gate), 0, 1);
}

/** Smooth a pose toward the next one (a = 0: stay, 1: jump). Blinks snap faster. */
export function smoothPose(prev, next, a = 0.45) {
  const out = { ...prev };
  for (const k of Object.keys(REST_POSE)) {
    if (next[k] === undefined) continue;
    const rate = k.startsWith('blink') ? Math.min(1, a * 1.8) : a;
    out[k] = prev[k] + (next[k] - prev[k]) * rate;
  }
  return out;
}

/** Expressions and gestures on keys 1-8 (they add to whatever the face is doing). */
export const GESTURES = [
  { key: '1', id: 'happy', label: '😊 Happy', pose: { smile: 1, brow: 0.3 } },
  { key: '2', id: 'surprised', label: '😮 Surprised', pose: { mouth: 0.8, brow: 1 } },
  { key: '3', id: 'wink', label: '😉 Wink', pose: { blinkR: 1, smile: 0.7 } },
  { key: '4', id: 'thinking', label: '🤔 Thinking', pose: { brow: -0.5, tilt: 10 } },
  { key: '5', id: 'wave', label: '👋 Wave', fx: '👋' },
  { key: '6', id: 'praise', label: '🙌 Praise', fx: '🙌' },
  { key: '7', id: 'music', label: '🎶 Music', fx: '🎶' },
  { key: '8', id: 'love', label: '💜 Love', fx: '💜' },
];

/** The final pose: tracked face + held expression (expressions win where they set a value). */
export function combinePose(face, voiceMouth = 0, gesture = null) {
  const pose = { ...REST_POSE, ...face };
  pose.mouth = Math.max(pose.mouth, voiceMouth);
  if (gesture?.pose) for (const [k, v] of Object.entries(gesture.pose)) pose[k] = k === 'tilt' ? pose[k] + v : Math.max(pose[k], v);
  return pose;
}

/** Put a pose on a face (an element holding a teacher face SVG). */
export function applyPose(el, pose) {
  for (const [k, v] of Object.entries(pose)) el.style.setProperty(`--${k}`, String(Math.round(v * 1000) / 1000));
}

export const PUPPET_BACKGROUNDS = {
  green: { label: 'Green screen (for OBS)', css: '#00b140' },
  blue: { label: 'Blue screen', css: '#0047bb' },
  church: { label: 'Church colors', css: 'radial-gradient(ellipse at 50% 20%, #5b2bb5, #0b0714 75%)' },
  studio: { label: 'Studio dark', css: 'radial-gradient(ellipse at 50% 30%, #2a2f3a, #0c0d12 75%)' },
};
