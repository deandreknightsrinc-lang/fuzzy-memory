import test from 'node:test';
import assert from 'node:assert/strict';
import { REST_POSE, poseFromBlendshapes, headAngles, poseFromHead, mouthFromLevel, smoothPose, GESTURES, combinePose, applyPose, PUPPET_BACKGROUNDS } from '../js/puppet.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const shapes = (o) => Object.entries(o).map(([categoryName, score]) => ({ categoryName, score }));

// A 4x4 column-major matrix (like MediaPipe's) for a head turned by yaw/pitch/roll (degrees),
// built as R = Rz(roll) * Ry(yaw) * Rx(pitch).
function matrix(yaw, pitch, roll) {
  const [y, p, r] = [yaw, pitch, roll].map((d) => (d * Math.PI) / 180);
  const Rx = [[1, 0, 0], [0, Math.cos(p), -Math.sin(p)], [0, Math.sin(p), Math.cos(p)]];
  const Ry = [[Math.cos(y), 0, Math.sin(y)], [0, 1, 0], [-Math.sin(y), 0, Math.cos(y)]];
  const Rz = [[Math.cos(r), -Math.sin(r), 0], [Math.sin(r), Math.cos(r), 0], [0, 0, 1]];
  const mul = (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
  const R = mul(Rz, mul(Ry, Rx));
  const m = new Array(16).fill(0);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) m[col * 4 + row] = R[row][col];
  m[15] = 1;
  m[14] = -40; // translation is ignored
  return m;
}

test('face blendshapes drive mouth, smile, eyes (mirrored) and brows', () => {
  assert.deepEqual(poseFromBlendshapes([]), { mouth: 0, smile: 0, blinkL: 0, blinkR: 0, brow: 0 });
  const p = poseFromBlendshapes(shapes({ jawOpen: 0.5, mouthSmileLeft: 0.6, mouthSmileRight: 0.6, eyeBlinkLeft: 0.9, eyeBlinkRight: 0.1, browInnerUp: 0.5 }));
  near(p.mouth, 0.8);
  near(p.smile, 0.84);
  assert.equal(p.blinkR, 1, 'your left eye closes the character\'s right eye (mirror)');
  assert.equal(p.blinkL, 0, 'a little eye squint is not a blink');
  near(p.brow, 0.8);
  assert.equal(poseFromBlendshapes(shapes({ browDownLeft: 1, browDownRight: 1 })).brow, -1);
  assert.equal(poseFromBlendshapes(shapes({ jawOpen: 1 })).mouth, 1, 'clamped');
});

test('head angles from the transformation matrix', () => {
  for (const [yaw, pitch, roll] of [[0, 0, 0], [20, 0, 0], [0, -15, 0], [0, 0, 12], [18, 10, -8]]) {
    const a = headAngles(matrix(yaw, pitch, roll));
    near(a.yaw, yaw, 1e-9);
    near(a.pitch, pitch, 1e-9);
    near(a.roll, roll, 1e-9);
  }
  assert.deepEqual(headAngles(null), { yaw: 0, pitch: 0, roll: 0 });
  const p = poseFromHead({ yaw: 15, pitch: -50, roll: 40 });
  near(p.turn, -0.5);
  assert.equal(p.nod, -1);
  assert.equal(p.tilt, 25, 'tilt follows roll (the image is mirrored for you and the character alike)');
});

test('voice level opens the mouth', () => {
  assert.equal(mouthFromLevel(0), 0);
  assert.equal(mouthFromLevel(0.01), 0, 'quiet room noise is ignored');
  assert.equal(mouthFromLevel(0.5), 1);
  near(mouthFromLevel(0.066), 0.5);
});

test('smoothing: moves part way, blinks faster, keeps missing values', () => {
  const s = smoothPose(REST_POSE, { mouth: 1, blinkL: 1 }, 0.5);
  near(s.mouth, 0.5);
  near(s.blinkL, 0.9);
  assert.equal(s.smile, 0);
  assert.equal(smoothPose(REST_POSE, { mouth: 1 }, 1).mouth, 1);
});

test('expressions add to the face; gestures are keys 1-8', () => {
  assert.deepEqual(GESTURES.map((g) => g.key), ['1', '2', '3', '4', '5', '6', '7', '8']);
  assert.ok(GESTURES.every((g) => g.pose || g.fx));
  const happy = GESTURES.find((g) => g.id === 'happy');
  const thinking = GESTURES.find((g) => g.id === 'thinking');
  const p = combinePose({ mouth: 0.2, tilt: 5 }, 0.6, happy);
  assert.equal(p.mouth, 0.6, 'voice opens the mouth more than the face');
  assert.equal(p.smile, 1);
  assert.equal(combinePose({ tilt: 5 }, 0, thinking).tilt, 15, 'tilts add');
  assert.equal(combinePose({ mouth: 0.9 }, 0.2).mouth, 0.9);
  assert.deepEqual(Object.keys(combinePose({})).sort(), Object.keys(REST_POSE).sort());
});

test('poses become CSS variables on the face', () => {
  const props = {};
  const el = { style: { setProperty: (k, v) => (props[k] = v) } };
  applyPose(el, { mouth: 0.12345, tilt: -7 });
  assert.deepEqual(props, { '--mouth': '0.123', '--tilt': '-7' });
  assert.equal(PUPPET_BACKGROUNDS.green.css, '#00b140');
});
