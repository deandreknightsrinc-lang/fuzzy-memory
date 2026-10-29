import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATES, BUILDING_TYPES, makeSite, placeCompound, removeCompound, addBuilding, setBuildingType,
  checkRules, stats, compoundFrame, toWorld, toLocal, toGeoJSON, toUnreal, parseDesign, toLatLon, compoundOnParcel,
} from '../js/model.js';

test('placeholder site: estates on both sides of the road, springs preserve at the east end', () => {
  const d = makeSite({ estates: 12 });
  assert.equal(d.parcels.length, 12);
  const north = d.parcels.filter((p) => p.y0 > 0), south = d.parcels.filter((p) => p.y1 < 0);
  assert.equal(north.length, 6);
  assert.equal(south.length, 6);
  for (const p of d.parcels) {
    assert.ok(p.acres > 10, `${p.id} has ${p.acres} acres`);
    assert.ok(p.x1 <= d.site.preserve.x0, 'estates stay out of the preserve');
  }
  assert.ok(d.site.spring.x > d.site.preserve.x0);
  assert.equal(d.site.origin.lat, null, 'no coordinates until the real site is known');
});

test('every template fits an estate with no rule problems', () => {
  for (const t of TEMPLATES) {
    const d = makeSite();
    placeCompound(d, 'E1', t.id);
    placeCompound(d, 'E12', t.id);
    assert.deepEqual(checkRules(d), [], t.id);
  }
});

test('placing again replaces the compound on that estate', () => {
  const d = makeSite();
  placeCompound(d, 'E3', 'ranch-row');
  placeCompound(d, 'E3', 'courtyard-ring');
  assert.equal(d.compounds.length, 1);
  assert.equal(compoundOnParcel(d, 'E3').templateId, 'courtyard-ring');
  removeCompound(d, 'E3');
  assert.equal(d.compounds.length, 0);
});

test('south-side estates face the road: the template is turned around', () => {
  const d = makeSite();
  const n = placeCompound(d, 'E1', 'ranch-row');
  const s = placeCompound(d, 'E7', 'ranch-row');
  const fn = compoundFrame(d, n), fs = compoundFrame(d, s);
  // Local +y is "away from the road": north for the north row, south for the south row.
  assert.ok(toWorld(fn, 0, 50).y > fn.cy);
  assert.ok(toWorld(fs, 0, 50).y < fs.cy);
});

test('world and local coordinates round-trip', () => {
  const d = makeSite();
  const c = placeCompound(d, 'E8', 'multi-generation');
  c.rotation = 0.7;
  const f = compoundFrame(d, c);
  const w = toWorld(f, 12.5, -30);
  const l = toLocal(f, w.x, w.y);
  assert.ok(Math.abs(l.x - 12.5) < 1e-9 && Math.abs(l.y + 30) < 1e-9);
});

test('rules: setback, springs buffer and building gap', () => {
  const d = makeSite();
  const c = placeCompound(d, 'E1', 'estate-manor');
  c.buildings[0].x = 200; // pushed off the estate
  let issues = checkRules(d);
  assert.ok(issues.some((i) => i.rule === 'setback' && i.buildingId === 'B1'));

  c.buildings[0].x = 0;
  c.buildings[1].x = c.buildings[0].x;
  c.buildings[1].y = c.buildings[0].y; // stacked on the main house
  issues = checkRules(d);
  assert.ok(issues.some((i) => i.rule === 'gap'));

  const d2 = makeSite();
  d2.site.spring = { name: 'Test spring', x: d2.parcels[0].x0 + 95, y: d2.parcels[0].y0 + 197, radius: 10 };
  placeCompound(d2, 'E1', 'courtyard-ring');
  assert.ok(checkRules(d2).some((i) => i.rule === 'spring'));
});

test('stats add up homes, bedrooms and roof area', () => {
  const d = makeSite();
  placeCompound(d, 'E1', 'ranch-row');
  const s = stats(d);
  assert.equal(s.compounds, 1);
  assert.equal(s.homes, 4);
  assert.equal(s.bedrooms, 3 * 3 + 5);
  const roof = 3 * 16 * 12 + 24 * 16 + 14 * 10 + 12 * 8;
  assert.equal(s.roofSqm, roof);
  assert.ok(s.openSpacePct > 95 && s.openSpacePct < 100);
});

test('editing buildings: add, change type', () => {
  const d = makeSite();
  const c = placeCompound(d, 'E2', 'hillside-terrace');
  const n = c.buildings.length;
  const b = addBuilding(d, c, 'workshop');
  assert.equal(c.buildings.length, n + 1);
  assert.ok(!c.buildings.slice(0, -1).some((x) => x.id === b.id), 'new id is unique');
  setBuildingType(b, 'guest');
  assert.equal(b.w, BUILDING_TYPES.guest.w);
  assert.equal(b.bedrooms, 1);
});

test('GeoJSON needs coordinates, then exports site, road, spring, estates and buildings', () => {
  const d = makeSite();
  placeCompound(d, 'E1', 'courtyard-ring');
  assert.throws(() => toGeoJSON(d), /latitude/);
  d.site.origin = { lat: 35, lon: -110, height: 0 };
  const g = toGeoJSON(d);
  const kinds = g.features.map((f) => f.properties.kind);
  assert.equal(kinds.filter((k) => k === 'estate').length, 12);
  assert.equal(kinds.filter((k) => k === 'building').length, 6);
  for (const k of ['site', 'road', 'spring']) assert.ok(kinds.includes(k));
  const ring = g.features.find((f) => f.properties.kind === 'building').geometry.coordinates[0];
  assert.deepEqual(ring[0], ring.at(-1), 'polygons are closed');
  // 1 km north is about 0.009 degrees of latitude.
  const [, lat] = toLatLon({ lat: 35, lon: -110 }, 0, 1000);
  assert.ok(Math.abs(lat - 35.00898) < 1e-4);
});

test('Unreal export carries world placements; files load back', () => {
  const d = makeSite();
  placeCompound(d, 'E7', 'estate-manor');
  const u = toUnreal(d);
  assert.equal(u.placements.length, 4);
  assert.ok(u.placements.every((p) => p.y < 0), 'south estate buildings sit south of the road');
  assert.equal(u.placements[0].yawDeg, 180);
  const back = parseDesign(JSON.stringify(u));
  assert.equal(back.placements, undefined);
  assert.equal(back.compounds.length, 1);
  assert.throws(() => parseDesign('{"hello":1}'), /not a Naka'tu Springs design/);
});

test('the Unreal sample design is current', async () => {
  const { readFileSync } = await import('node:fs');
  const { sampleDesign } = await import('../unreal/make-sample.mjs');
  const saved = JSON.parse(readFileSync(new URL('../unreal/Designs/sample-design.json', import.meta.url), 'utf8'));
  assert.deepEqual(saved, JSON.parse(JSON.stringify(sampleDesign())), 'run: node unreal/make-sample.mjs');
});
