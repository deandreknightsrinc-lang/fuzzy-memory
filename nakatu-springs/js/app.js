import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import {
  TEMPLATES, BUILDING_TYPES, makeSite, placeCompound, removeCompound, addBuilding, setBuildingType,
  checkRules, stats, compoundFrame, toWorld, toLocal, buildingWorld, parcelById, compoundOnParcel, parcelCenter,
  templateById, toGeoJSON, toUnreal, parseDesign,
} from './model.js';

const KEY = 'nakatu-design-v1';
const OPTIONS_KEY = 'nakatu-options-v1';
const TOUR_KEY = 'nakatu-tour-done';

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window */ } },
};

let design = loadDesign();
let sel = { parcelId: null, buildingId: null };
let issues = [];
const undoStack = [];

function loadDesign() {
  try { const d = store.get(KEY); if (d) return parseDesign(d); } catch { /* fall through */ }
  return makeSite();
}

function commit(mutate) {
  undoStack.push(JSON.stringify(design));
  if (undoStack.length > 60) undoStack.shift();
  mutate();
  changed();
}

function changed() {
  store.set(KEY, design);
  issues = checkRules(design);
  rebuildScene();
  renderPanels();
}

function undo() {
  const prev = undoStack.pop();
  if (!prev) return;
  design = parseDesign(prev);
  if (sel.parcelId && !parcelById(design, sel.parcelId)) sel = { parcelId: null, buildingId: null };
  changed();
}

// ---------- 3D scene (three.js y is up; site y = north maps to -z) ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fc4df, 1800, 4200);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 8000);
camera.position.set(-300, 650, 750);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 20;
controls.maxDistance = 2600;
controls.enableDamping = true;

const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a5a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 10, far: 4000 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const P = (x, y, h = 0) => new THREE.Vector3(x, h, -y);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const COLORS = {
  ground: 0x6f8f4e, preserve: 0x557a3f, parcel: 0x7fa05a, parcelUsed: 0x8cab62, parcelSel: 0xa9c97a,
  road: 0x5b5650, water: 0x3d8fd1, edge: 0xe9f0dc, edgeSel: 0xffffff,
  main: 0xd9c6a5, home: 0xe3d5bb, guest: 0xcdbb9a, hall: 0xb98e62, workshop: 0x9c8c78, garage: 0xa7a19a, pavilion: 0x8a6a4a,
  roof: 0x6b4a3a, roofSel: 0x3fb68b, bad: 0xef5d5d,
};

const staticGroup = new THREE.Group();
const dynamicGroup = new THREE.Group();
scene.add(staticGroup, dynamicGroup);
let pickables = [];
let buildingMeshes = new Map();

function disposeGroup(g) {
  g.traverse((o) => { o.geometry?.dispose?.(); if (o.material && !o.material.shared) o.material.dispose?.(); o.material?.map?.dispose?.(); });
  g.clear();
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function buildStatic() {
  disposeGroup(staticGroup);
  const { boundary: b, preserve, spring, road } = design.site;
  const W = b.x1 - b.x0, D = b.y1 - b.y0;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 3000, D + 3000), mat(COLORS.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  ground.userData.ground = true;
  staticGroup.add(ground);

  const pres = new THREE.Mesh(new THREE.PlaneGeometry(preserve.x1 - preserve.x0, preserve.y1 - preserve.y0), mat(COLORS.preserve));
  pres.rotation.x = -Math.PI / 2;
  pres.position.copy(P((preserve.x0 + preserve.x1) / 2, (preserve.y0 + preserve.y1) / 2, -0.1));
  pres.receiveShadow = true;
  staticGroup.add(pres);

  const water = new THREE.Mesh(new THREE.CircleGeometry(spring.radius, 48), mat(COLORS.water, { roughness: 0.15, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2;
  water.position.copy(P(spring.x, spring.y, 0.15));
  staticGroup.add(water);
  staticGroup.add(label(spring.name, P(spring.x, spring.y, 14), 0xbfe3ff));

  for (let i = 1; i < road.points.length; i++) {
    const [ax, ay] = road.points[i - 1], [bx, by] = road.points[i];
    const len = Math.hypot(bx - ax, by - ay);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(len, road.width), mat(COLORS.road));
    r.rotation.x = -Math.PI / 2;
    r.rotation.z = Math.atan2(by - ay, bx - ax);
    r.position.copy(P((ax + bx) / 2, (ay + by) / 2, 0.05));
    r.receiveShadow = true;
    staticGroup.add(r);
  }

  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([P(b.x0, b.y0, 0.3), P(b.x1, b.y0, 0.3), P(b.x1, b.y1, 0.3), P(b.x0, b.y1, 0.3)]),
    new THREE.LineBasicMaterial({ color: 0xffe9a8 }),
  );
  staticGroup.add(outline);
  staticGroup.add(trees());
}

function trees() {
  const { preserve, spring, boundary: b, road } = design.site;
  const rnd = seeded(7);
  const spots = [];
  for (let i = 0; i < 700; i++) {
    const x = preserve.x0 + 10 + rnd() * (preserve.x1 - preserve.x0 - 20);
    const y = preserve.y0 + 10 + rnd() * (preserve.y1 - preserve.y0 - 20);
    const dist = Math.hypot(x - spring.x, y - spring.y);
    if (dist < spring.radius + 18 || Math.abs(y) < road.width) continue;
    spots.push([x, y, 0.7 + rnd() * 0.7]);
  }
  for (let x = b.x0 + 10; x < preserve.x0; x += 22) {
    spots.push([x, road.width / 2 + 5, 0.8], [x, -road.width / 2 - 5, 0.8]);
  }
  for (let i = 0; i < 500; i++) {
    const side = Math.floor(rnd() * 4);
    const t = rnd();
    const x = side < 2 ? b.x0 - 40 + t * (b.x1 - b.x0 + 80) : (side === 2 ? b.x0 - 30 - rnd() * 300 : b.x1 + 30 + rnd() * 300);
    const y = side === 0 ? b.y1 + 30 + rnd() * 300 : side === 1 ? b.y0 - 30 - rnd() * 300 : b.y0 + t * (b.y1 - b.y0);
    spots.push([x, y, 0.7 + rnd() * 0.8]);
  }
  const g = new THREE.Group();
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(4, 12, 7), mat(0x2f5a2c), spots.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.7, 4, 5), mat(0x5a4330), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  spots.forEach(([x, y, k], i) => {
    s.set(k, k, k);
    crown.setMatrixAt(i, m.compose(P(x, y, 4 * k + 6 * k), q, s));
    trunk.setMatrixAt(i, m.compose(P(x, y, 2 * k), q, s));
  });
  crown.castShadow = true;
  g.add(crown, trunk);
  return g;
}

function label(text, pos, color = 0xffffff) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = '600 40px system-ui, sans-serif';
  ctx.font = font;
  c.width = Math.ceil(ctx.measureText(text).width) + 28;
  c.height = 60;
  ctx.font = font;
  ctx.fillStyle = 'rgba(14,15,19,0.6)';
  ctx.beginPath();
  ctx.roundRect(0, 0, c.width, c.height, 14);
  ctx.fill();
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 14, 32);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sprite.scale.set(c.width / 3, c.height / 3, 1);
  sprite.position.copy(pos);
  sprite.renderOrder = 10;
  return sprite;
}

function buildingMesh(b, world, bad, selected) {
  const g = new THREE.Group();
  const roofH = Math.min(b.w, b.d) * 0.28;
  const bodyH = Math.max(2.5, b.h - roofH);
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, bodyH, b.d), mat(COLORS[b.type] ?? 0xcccccc, { emissive: bad ? COLORS.bad : 0x000000, emissiveIntensity: bad ? 0.45 : 0 }));
  body.position.y = bodyH / 2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), mat(selected ? COLORS.roofSel : COLORS.roof));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(b.w * 1.08, roofH, b.d * 1.08);
  roof.position.y = bodyH + roofH / 2;
  for (const m of [body, roof]) { m.castShadow = true; m.receiveShadow = true; }
  g.add(body, roof);
  g.position.copy(P(world.x, world.y));
  g.rotation.y = world.rot;
  return g;
}

function rebuildScene() {
  disposeGroup(dynamicGroup);
  pickables = [];
  buildingMeshes = new Map();
  const bad = new Set(issues.map((i) => `${i.compoundId}/${i.buildingId}`));
  for (const p of design.parcels) {
    const used = !!compoundOnParcel(design, p.id);
    const isSel = sel.parcelId === p.id;
    const w = p.x1 - p.x0, d = p.y1 - p.y0;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, d - 2), mat(isSel ? COLORS.parcelSel : used ? COLORS.parcelUsed : COLORS.parcel));
    plane.rotation.x = -Math.PI / 2;
    plane.position.copy(P((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, 0.02));
    plane.receiveShadow = true;
    plane.userData = { parcelId: p.id };
    pickables.push(plane);
    const edge = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([P(p.x0 + 1, p.y0 + 1, 0.2), P(p.x1 - 1, p.y0 + 1, 0.2), P(p.x1 - 1, p.y1 - 1, 0.2), P(p.x0 + 1, p.y1 - 1, 0.2)]),
      new THREE.LineBasicMaterial({ color: isSel ? COLORS.edgeSel : COLORS.edge, transparent: true, opacity: isSel ? 1 : 0.45 }),
    );
    const c = parcelCenter(p);
    const name = p.family ? `${p.name}: ${p.family}` : p.name;
    dynamicGroup.add(plane, edge, label(name, P(c.x, p.y0 > 0 ? p.y1 - 30 : p.y0 + 30, 10)));
  }
  for (const c of design.compounds) {
    for (const b of c.buildings) {
      const w = buildingWorld(design, c, b);
      const g = buildingMesh(b, w, bad.has(`${c.id}/${b.id}`), sel.parcelId === c.parcelId && sel.buildingId === b.id);
      g.traverse((o) => { o.userData = { parcelId: c.parcelId, buildingId: b.id }; });
      pickables.push(...g.children);
      buildingMeshes.set(`${c.parcelId}/${b.id}`, g);
      dynamicGroup.add(g);
    }
  }
}

function setSun(hour) {
  const t = ((hour - 6) / 12) * Math.PI;
  const el = Math.max(0.05, Math.sin(t));
  sun.position.set(Math.cos(t) * 1500, el * 1400 + 60, 600);
  sun.intensity = 0.4 + 2.0 * el;
  const warm = new THREE.Color(0xffb36b).lerp(new THREE.Color(0xfff4e2), el);
  sun.color.copy(warm);
  const sky = new THREE.Color(0xf2a86a).lerp(new THREE.Color(0x9fc4df), Math.min(1, el * 1.6));
  scene.background = sky;
  scene.fog.color.copy(sky);
  const h = Math.floor(hour), m = Math.round((hour - h) * 60);
  $('sun-out').value = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas.parentElement);

// ---------- picking and dragging ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let drag = null;

function pointerToRay(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}

function pick(e) {
  pointerToRay(e);
  return ray.intersectObjects(pickables, false)[0]?.object.userData ?? null;
}

function groundPoint(e) {
  pointerToRay(e);
  const v = new THREE.Vector3();
  return ray.ray.intersectPlane(groundPlane, v) ? { x: v.x, y: -v.z } : null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (walk.on) return;
  const hit = pick(e);
  if (!hit) return;
  if (hit.buildingId && sel.buildingId === hit.buildingId && sel.parcelId === hit.parcelId) {
    const c = compoundOnParcel(design, hit.parcelId);
    const b = c.buildings.find((x) => x.id === hit.buildingId);
    const gp = groundPoint(e);
    if (gp) {
      const f = compoundFrame(design, c);
      const local = toLocal(f, gp.x, gp.y);
      drag = { c, b, f, dx: b.x - local.x, dy: b.y - local.y, before: JSON.stringify(design), moved: false };
      controls.enabled = false;
      canvas.setPointerCapture(e.pointerId);
    }
    return;
  }
  drag = { click: hit, x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag?.b) return;
  const gp = groundPoint(e);
  if (!gp) return;
  const local = toLocal(drag.f, gp.x, gp.y);
  drag.b.x = Math.round((local.x + drag.dx) * 2) / 2;
  drag.b.y = Math.round((local.y + drag.dy) * 2) / 2;
  drag.moved = true;
  const g = buildingMeshes.get(`${drag.c.parcelId}/${drag.b.id}`);
  const w = buildingWorld(design, drag.c, drag.b);
  g?.position.copy(P(w.x, w.y));
});

canvas.addEventListener('pointerup', (e) => {
  if (drag?.b) {
    controls.enabled = true;
    if (drag.moved) { undoStack.push(drag.before); changed(); }
  } else if (drag?.click && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) {
    select(drag.click.parcelId, drag.click.buildingId ?? null);
  }
  drag = null;
});

canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  const tplId = e.dataTransfer.getData('text/plain');
  const hit = pick(e);
  if (hit?.parcelId && templateById(tplId)) {
    commit(() => placeCompound(design, hit.parcelId, tplId));
    select(hit.parcelId, null);
  }
});

function select(parcelId, buildingId = null) {
  sel = { parcelId, buildingId };
  rebuildScene();
  renderPanels();
}

function focusParcel(id) {
  const p = parcelById(design, id);
  const c = parcelCenter(p);
  const target = P(c.x, c.y);
  const dir = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(target);
  camera.position.copy(target.clone().add(dir.multiplyScalar(320)));
}

// ---------- walk mode ----------
const walk = { on: false, yaw: 0, pitch: 0, keys: new Set(), saved: null, look: null };
function startWalk() {
  const p = sel.parcelId ? parcelById(design, sel.parcelId) : design.parcels[0];
  const c = parcelCenter(p);
  const compound = compoundOnParcel(design, p.id);
  // Start in front of the compound (or at the estate's road edge) looking in.
  const frame = compound ? compoundFrame(design, compound) : { cx: c.x, cy: c.y, angle: p.facing };
  const start = compound ? toWorld(frame, 0, -75) : { x: c.x, y: p.y0 > 0 ? p.y0 + 8 : p.y1 - 8 };
  walk.saved = { pos: camera.position.clone(), target: controls.target.clone() };
  walk.on = true;
  controls.enabled = false;
  camera.position.copy(P(start.x, start.y, 1.7));
  walk.yaw = frame.angle;
  scene.traverse((o) => { if (o.isSprite) o.visible = false; });
  walk.pitch = 0;
  camera.rotation.order = 'YXZ';
  $('walk').textContent = 'Stop walking';
  $('walk-help').hidden = false;
  canvas.focus();
}
function stopWalk() {
  if (!walk.on) return;
  walk.on = false;
  camera.position.copy(walk.saved.pos);
  controls.target.copy(walk.saved.target);
  controls.enabled = true;
  camera.rotation.order = 'XYZ';
  camera.lookAt(controls.target);
  scene.traverse((o) => { if (o.isSprite) o.visible = true; });
  $('walk').textContent = 'Walk';
  $('walk-help').hidden = true;
}
canvas.tabIndex = 0;
addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (walk.on) {
    if (e.key === 'Escape') stopWalk();
    walk.keys.add(e.key.toLowerCase());
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && sel.buildingId) {
    deleteBuilding();
  }
});
addEventListener('keyup', (e) => walk.keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown', (e) => { if (walk.on) walk.look = { x: e.clientX, y: e.clientY }; });
addEventListener('pointermove', (e) => {
  if (!walk.on || !walk.look) return;
  walk.yaw -= (e.clientX - walk.look.x) * 0.004;
  walk.pitch = Math.max(-1.2, Math.min(1.2, walk.pitch - (e.clientY - walk.look.y) * 0.004));
  walk.look = { x: e.clientX, y: e.clientY };
});
addEventListener('pointerup', () => { walk.look = null; });

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  if (walk.on) {
    const k = walk.keys;
    const speed = (k.has('shift') ? 14 : 5) * dt;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    camera.position.x += (-Math.sin(walk.yaw) * fwd + Math.cos(walk.yaw) * side) * speed;
    camera.position.z += (-Math.cos(walk.yaw) * fwd - Math.sin(walk.yaw) * side) * speed;
    camera.position.y = 1.7;
    camera.rotation.set(walk.pitch, walk.yaw, 0);
  } else {
    controls.update();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---------- panels ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderTemplates() {
  $('templates').innerHTML = TEMPLATES.map((t) => {
    const homes = t.buildings.filter((b) => BUILDING_TYPES[b.type].home).length;
    const beds = t.buildings.reduce((n, b) => n + BUILDING_TYPES[b.type].bedrooms, 0);
    return `<button class="card" draggable="true" data-tpl="${t.id}"><strong>${esc(t.name)}</strong><small>${esc(t.blurb)}</small><small class="mini">${homes} homes, ${beds} bedrooms, ${t.buildings.length} buildings</small></button>`;
  }).join('');
  for (const el of $('templates').querySelectorAll('[data-tpl]')) {
    el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', el.dataset.tpl));
    el.addEventListener('click', () => {
      if (!sel.parcelId) { $('tpl-hint').classList.add('warn'); $('tpl-hint').textContent = 'Click an estate on the map first, then the template.'; return; }
      commit(() => placeCompound(design, sel.parcelId, el.dataset.tpl));
      select(sel.parcelId, null);
    });
  }
}

function renderPanels() {
  const badParcels = new Set(issues.map((i) => i.compoundId));
  $('estates').innerHTML = design.parcels.map((p) => {
    const c = compoundOnParcel(design, p.id);
    const dot = c ? (badParcels.has(c.id) ? 'bad' : 'on') : '';
    const what = c ? templateById(c.templateId)?.name ?? 'Custom' : 'Empty';
    return `<li><button data-p="${p.id}" class="${sel.parcelId === p.id ? 'sel' : ''}"><span><span class="dot ${dot}"></span>${esc(p.family ? `${p.name}: ${p.family}` : p.name)}</span><small>${p.acres} ac · ${esc(what)}</small></button></li>`;
  }).join('');
  for (const el of $('estates').querySelectorAll('[data-p]')) {
    el.addEventListener('click', () => { select(el.dataset.p, null); focusParcel(el.dataset.p); });
  }

  $('rule-count').textContent = issues.length || '';
  $('issues').innerHTML = issues.length
    ? issues.map((i, n) => `<li data-i="${n}">${esc(i.message)}</li>`).join('')
    : '<li class="ok">Every building meets the site rules.</li>';
  for (const el of $('issues').querySelectorAll('[data-i]')) {
    el.addEventListener('click', () => {
      const i = issues[+el.dataset.i];
      const c = design.compounds.find((x) => x.id === i.compoundId);
      select(c.parcelId, i.buildingId);
      focusParcel(c.parcelId);
    });
  }

  const s = stats(design);
  const rows = [
    ['Site', `${s.siteAcres} acres`], ['Estates', s.estates], ['Compounds placed', s.compounds],
    ['Homes', s.homes], ['Bedrooms', s.bedrooms], ['Buildings', s.buildings],
    ['Roof area', `${s.roofSqm.toLocaleString()} m²`], ['Main road', `${s.roadM.toLocaleString()} m`], ['Open space', `${s.openSpacePct}%`],
  ];
  $('stats').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  renderInspector();
}

function renderInspector() {
  const box = $('inspector');
  if (!sel.parcelId) { box.innerHTML = '<p class="hint">Click an estate or a building on the map.</p>'; return; }
  const p = parcelById(design, sel.parcelId);
  const c = compoundOnParcel(design, p.id);
  const b = c && sel.buildingId ? c.buildings.find((x) => x.id === sel.buildingId) : null;
  const typeOptions = (cur) => Object.entries(BUILDING_TYPES).map(([k, t]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${t.label}</option>`).join('');

  if (b) {
    box.innerHTML = `
      <h3>${esc(BUILDING_TYPES[b.type].label)} <small class="hint">${b.id} on ${esc(p.name)}</small></h3>
      <p class="hint">Drag it on the map to move it.</p>
      <label>Building type <select id="b-type">${typeOptions(b.type)}</select></label>
      <div class="row">
        <label>Width (m) <input id="b-w" type="number" min="4" max="80" step="1" value="${b.w}" /></label>
        <label>Depth (m) <input id="b-d" type="number" min="4" max="80" step="1" value="${b.d}" /></label>
      </div>
      <div class="row">
        <label>Height (m) <input id="b-h" type="number" min="3" max="30" step="0.5" value="${b.h}" /></label>
        <label>Bedrooms <input id="b-bed" type="number" min="0" max="20" step="1" value="${b.bedrooms}" /></label>
      </div>
      <div class="btns">
        <button id="b-rl">Turn left 15°</button><button id="b-rr">Turn right 15°</button>
        <button id="b-del" class="danger">Remove</button><button id="b-back">Back to estate</button>
      </div>`;
    $('b-type').onchange = (e) => commit(() => setBuildingType(b, e.target.value));
    for (const [id, key] of [['b-w', 'w'], ['b-d', 'd'], ['b-h', 'h'], ['b-bed', 'bedrooms']]) {
      $(id).onchange = (e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0) commit(() => { b[key] = v; }); };
    }
    $('b-rl').onclick = () => commit(() => { b.rot += Math.PI / 12; });
    $('b-rr').onclick = () => commit(() => { b.rot -= Math.PI / 12; });
    $('b-del').onclick = deleteBuilding;
    $('b-back').onclick = () => select(p.id, null);
    return;
  }

  box.innerHTML = `
    <h3>${esc(p.name)}</h3>
    <p class="hint">${p.acres} acres · ${Math.round(p.x1 - p.x0)} × ${Math.round(p.y1 - p.y0)} m</p>
    <label>Family <input id="p-fam" placeholder="Family name" value="${esc(p.family)}" /></label>
    ${c ? `
      <p>Compound: <strong>${esc(templateById(c.templateId)?.name ?? 'Custom')}</strong>, ${c.buildings.length} buildings</p>
      <div class="btns">
        <button id="c-rl">Turn compound left 15°</button><button id="c-rr">Turn right 15°</button>
      </div>
      <label>Add a building <select id="c-add"><option value="">Choose…</option>${typeOptions('')}</select></label>
      <div class="btns"><button id="c-del" class="danger">Clear this estate</button></div>
      <p class="hint">Click a building to change it.</p>`
    : '<p class="hint">Empty. Click a template on the left to place a compound here.</p>'}`;
  $('p-fam').onchange = (e) => commit(() => { p.family = e.target.value.trim(); });
  if (c) {
    $('c-rl').onclick = () => commit(() => { c.rotation += Math.PI / 12; });
    $('c-rr').onclick = () => commit(() => { c.rotation -= Math.PI / 12; });
    $('c-add').onchange = (e) => {
      if (!e.target.value) return;
      let nb;
      commit(() => { nb = addBuilding(design, c, e.target.value); });
      select(p.id, nb.id);
    };
    $('c-del').onclick = () => { commit(() => removeCompound(design, p.id)); select(p.id, null); };
  }
}

function deleteBuilding() {
  const c = compoundOnParcel(design, sel.parcelId);
  if (!c) return;
  commit(() => { c.buildings = c.buildings.filter((x) => x.id !== sel.buildingId); });
  select(sel.parcelId, null);
}

// ---------- site settings ----------
$('site-btn').onclick = () => {
  const f = $('site-dlg').querySelector('form');
  f.name.value = design.site.name;
  f.lat.value = design.site.origin.lat ?? '';
  f.lon.value = design.site.origin.lon ?? '';
  f.setback.value = design.rules.setback;
  f.springBuffer.value = design.rules.springBuffer;
  f.minGap.value = design.rules.minGap;
  f.estates.value = design.parcels.length;
  $('site-dlg').showModal();
};
$('site-dlg').addEventListener('close', () => {
  if ($('site-dlg').returnValue !== 'ok') return;
  const f = $('site-dlg').querySelector('form');
  const num = (v) => (v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const n = Math.max(2, Math.min(40, Math.round(num(f.estates.value) ?? design.parcels.length)));
  commit(() => {
    if (n !== design.parcels.length) {
      const fresh = makeSite({ estates: n });
      design.parcels = fresh.parcels;
      design.compounds = [];
      design.site = { ...fresh.site, name: design.site.name, origin: design.site.origin };
      sel = { parcelId: null, buildingId: null };
      buildStatic();
    }
    design.site.name = f.name.value.trim() || design.site.name;
    design.site.origin = { lat: num(f.lat.value), lon: num(f.lon.value), height: design.site.origin.height ?? 0 };
    for (const k of ['setback', 'springBuffer', 'minGap']) { const v = num(f[k].value); if (v !== null && v >= 0) design.rules[k] = v; }
  });
});

// ---------- options, files ----------
const loadOptions = () => store.get(OPTIONS_KEY) || {};
function renderOptions() {
  const opts = loadOptions();
  const names = Object.keys(opts);
  $('options').innerHTML = names.length
    ? names.map((n) => `<li><span>${esc(n)} <small class="hint">${new Date(opts[n].savedAt).toLocaleString()}</small></span><button type="button" data-open="${esc(n)}">Open</button><button type="button" class="danger" data-del="${esc(n)}">Delete</button></li>`).join('')
    : '<li class="hint">No saved options yet.</li>';
  for (const el of $('options').querySelectorAll('[data-open]')) {
    el.onclick = () => { const d = opts[el.dataset.open].design; commit(() => { design = parseDesign(d); sel = { parcelId: null, buildingId: null }; }); buildStatic(); rebuildScene(); msg(`Opened "${el.dataset.open}".`); };
  }
  for (const el of $('options').querySelectorAll('[data-del]')) {
    el.onclick = () => { const o = loadOptions(); delete o[el.dataset.del]; store.set(OPTIONS_KEY, o); renderOptions(); };
  }
}
const msg = (t) => { $('file-msg').textContent = t; };
$('file-btn').onclick = () => { renderOptions(); $('compare').innerHTML = ''; msg(''); $('file-dlg').showModal(); };
$('opt-save').onclick = () => {
  const name = $('opt-name').value.trim() || `Option ${Object.keys(loadOptions()).length + 1}`;
  const o = loadOptions();
  o[name] = { savedAt: Date.now(), design: structuredClone(design) };
  store.set(OPTIONS_KEY, o);
  $('opt-name').value = '';
  renderOptions();
  msg(`Saved "${name}".`);
};
$('opt-compare').onclick = () => {
  const opts = { 'Current design': { design }, ...loadOptions() };
  const cols = Object.entries(opts).map(([n, o]) => [n, stats(o.design), checkRules(o.design).length]);
  const row = (label, f) => `<tr><td>${label}</td>${cols.map((c) => `<td>${f(c)}</td>`).join('')}</tr>`;
  $('compare').innerHTML = `<table><tr><th></th>${cols.map(([n]) => `<th>${esc(n)}</th>`).join('')}</tr>
    ${row('Compounds', (c) => c[1].compounds)}${row('Homes', (c) => c[1].homes)}${row('Bedrooms', (c) => c[1].bedrooms)}
    ${row('Roof area (m²)', (c) => c[1].roofSqm.toLocaleString())}${row('Open space', (c) => `${c[1].openSpacePct}%`)}${row('Rule problems', (c) => c[2])}</table>`;
};
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const slug = () => design.site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nakatu-springs';
$('exp-json').onclick = () => download(`${slug()}-design.json`, JSON.stringify(toUnreal(design), null, 2), 'application/json');
$('exp-geo').onclick = () => {
  try { download(`${slug()}.geojson`, JSON.stringify(toGeoJSON(design)), 'application/geo+json'); }
  catch (e) { msg(`${e.message} (Site button).`); }
};
$('exp-png').onclick = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${slug()}.png`;
  a.click();
};
$('imp-json').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const d = parseDesign(await file.text());
    commit(() => { design = d; sel = { parcelId: null, buildingId: null }; });
    buildStatic(); rebuildScene();
    msg(`Opened ${file.name}.`);
  } catch (err) { msg(err.message); }
  e.target.value = '';
};
$('new-design').onclick = () => {
  if (!confirm('Start a new layout? Save an option first if you want to keep this one.')) return;
  commit(() => { design = makeSite({ name: design.site.name, lat: design.site.origin.lat, lon: design.site.origin.lon }); sel = { parcelId: null, buildingId: null }; });
  buildStatic(); rebuildScene();
};

$('undo').onclick = undo;
$('walk').onclick = () => (walk.on ? stopWalk() : startWalk());
$('sun').oninput = (e) => setSun(Number(e.target.value));
if (!store.get(TOUR_KEY)) $('tour').hidden = false;
$('tour-ok').onclick = () => { $('tour').hidden = true; store.set(TOUR_KEY, true); };

renderTemplates();
buildStatic();
setSun(15);
resize();
changed();
tick();
window.nakatu = { get design() { return design; }, select, placeCompound: (p, t) => { commit(() => placeCompound(design, p, t)); select(p, null); } };
