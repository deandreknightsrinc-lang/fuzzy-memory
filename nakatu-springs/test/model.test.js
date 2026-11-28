import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATES, BUILDING_TYPES, makeSite, placeCompound, removeCompound, addBuilding, setBuildingType,
  checkRules, stats, compoundFrame, toWorld, toLocal, toGeoJSON, toUnreal, parseDesign, toLatLon, compoundOnParcel,
  siteFromBoundary, relayout, parcelCenter,
} from '../js/model.js';
import { parseBoundary, polyArea, pointInPoly, fromLatLon } from '../js/geo.js';

test('placeholder site: estates on both sides of the road, springs preserve at the east end', () => {
  const d = makeSite({ estates: 12 });
  assert.equal(d.parcels.length, 12);
  const north = d.parcels.filter((p) => p.y0 > 0), south = d.parcels.filter((p) => p.y1 < 0);
  assert.equal(north.length, 6);
  assert.equal(south.length, 6);
  for (const p of d.parcels) {
    assert.ok(p.acres > 10, `${p.id} has ${p.acres} acres`);
    assert.ok(p.x1 <= Math.min(...d.site.preserve.map((q) => q[0])) + 1e-9, 'estates stay out of the preserve');
  }
  assert.equal(d.parcels[0].acres, 18.5);
  assert.ok(d.site.spring.x > 440);
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

// A rough L-shaped site near 35 N, 111 W, about 1.6 km by 1 km, drawn clockwise like many KML exports.
const L_RING = [[-111.0, 35.0], [-111.0, 35.009], [-110.991, 35.009], [-110.991, 35.0045], [-110.9825, 35.0045], [-110.9825, 35.0], [-111.0, 35.0]];
const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Pin</name><Point><coordinates>-110.99,35.003,0</coordinates></Point></Placemark>
<Placemark><name>Naka'tu boundary</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
${L_RING.map(([lon, lat]) => `${lon},${lat},0`).join(' ')}
</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;

test('boundary import: KML from Google Earth or My Maps, and GeoJSON', () => {
  assert.deepEqual(parseBoundary(KML), L_RING);
  const gj = { type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-111, 35], [-111, 35.0001], [-110.9999, 35]]] } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [L_RING] } },
  ] };
  assert.deepEqual(parseBoundary(JSON.stringify(gj)), L_RING, 'the largest shape wins');
  assert.throws(() => parseBoundary('{"type":"Point","coordinates":[1,2]}'), /No boundary shape/);
});

test('a real boundary becomes a site: origin at its middle, estates inside it, nothing over the line', () => {
  const d = siteFromBoundary(parseBoundary(KML), { estates: 10 });
  const o = d.site.origin;
  assert.ok(Math.abs(o.lat - 35.004) < 0.003 && Math.abs(o.lon + 110.992) < 0.006, `origin ${o.lat}, ${o.lon}`);
  const siteArea = Math.abs(polyArea(d.site.poly));
  const mLon = 111320 * Math.cos((o.lat * Math.PI) / 180);
  const lArea = (0.009 * 111320) * (0.0175 * mLon) - (0.0045 * 111320) * (0.0085 * mLon);
  assert.ok(Math.abs(siteArea - lArea) / lArea < 0.01, `site ${siteArea} vs ${lArea}`);
  assert.ok(d.parcels.length >= 6 && d.parcels.length <= 10, `${d.parcels.length} estates`);
  let used = Math.abs(polyArea(d.site.preserve));
  for (const p of d.parcels) {
    used += Math.abs(polyArea(p.poly));
    const c = parcelCenter(p);
    assert.ok(pointInPoly(c.x, c.y, d.site.poly), `${p.id} sits inside the boundary`);
  }
  assert.ok(used <= siteArea + 1 && used > siteArea * 0.9, 'estates, preserve and road fill the site');
  assert.ok(pointInPoly(d.site.spring.x, d.site.spring.y, d.site.poly), 'springs on site');
  const big = d.parcels.reduce((a, b) => (b.acres > a.acres ? b : a));
  placeCompound(d, big.id, 'estate-manor');
  assert.deepEqual(checkRules(d), []);
  assert.ok(toGeoJSON(d).features.length > d.parcels.length);
});

test('the road follows the long side of a turned site', () => {
  const o = { lat: 35, lon: -111 };
  // A 2000 x 600 m strip running northeast.
  const a = Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
  const local = [[-1000, -300], [1000, -300], [1000, 300], [-1000, 300]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const ring = local.map(([x, y]) => toLatLon(o, x, y));
  const d = siteFromBoundary(ring, { estates: 8 });
  assert.ok(Math.abs(d.site.angle - a) < 0.05, `angle ${d.site.angle}`);
  const [[x0, y0], [x1, y1]] = d.site.road.points;
  assert.ok(Math.abs(Math.atan2(y1 - y0, x1 - x0) - a) < 0.05);
  assert.equal(d.parcels.length, 8);
  for (const p of d.parcels) assert.ok(p.acres > 25, `${p.id} ${p.acres} ac`);
});

test('changing the number of estates keeps names, families and compounds that still fit', () => {
  const d = makeSite();
  d.parcels[0].family = 'Knight';
  placeCompound(d, 'E1', 'ranch-row');
  placeCompound(d, 'E12', 'ranch-row');
  relayout(d, { estates: 8 });
  assert.equal(d.parcels.length, 8);
  assert.equal(d.parcels[0].family, 'Knight');
  assert.deepEqual(d.compounds.map((c) => c.parcelId), ['E1']);
});

test('designs saved before estates had shapes still open', () => {
  const v1 = {
    format: 'nakatu-design', version: 1,
    site: { name: 'Old', origin: { lat: null, lon: null, height: 0 }, boundary: { x0: -700, y0: -400, x1: 700, y1: 400 },
      road: { width: 12, points: [[-700, 0], [480, 0]] }, spring: { name: 'The Springs', x: 570, y: 40, radius: 45 },
      preserve: { x0: 440, y0: -400, x1: 700, y1: 400 } },
    rules: { setback: 15, springBuffer: 60, minGap: 4 },
    parcels: [{ id: 'E1', name: 'Estate 1', family: '', facing: 0, x0: -700, y0: 6, x1: -510, y1: 400, acres: 18.5 }],
    compounds: [],
  };
  const d = parseDesign(JSON.stringify(v1));
  assert.equal(d.version, 2);
  assert.equal(d.parcels[0].poly.length, 4);
  placeCompound(d, 'E1', 'courtyard-ring');
  assert.deepEqual(checkRules(d), []);
  assert.equal(stats(d).siteAcres, makeSite().parcels.length && stats(makeSite()).siteAcres);
  assert.deepEqual(fromLatLon({ lat: 35, lon: -111 }, -111, 35), [0, 0]);
});
