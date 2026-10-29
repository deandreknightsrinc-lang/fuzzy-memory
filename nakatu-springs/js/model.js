// Naka'tu Springs design model: site, estates, compound templates, rules and stats.
// Units are meters. Site frame: x = east, y = north, origin at the site center.
// The same JSON loads into the Unreal project (see ../unreal/README.md).

export const FORMAT = 'nakatu-design';
export const VERSION = 1;

const SQ_M_PER_ACRE = 4046.8564224;
export const acres = (sqm) => sqm / SQ_M_PER_ACRE;

export const BUILDING_TYPES = {
  main: { label: 'Main house', w: 24, d: 16, h: 8, bedrooms: 5, home: true },
  home: { label: 'Family home', w: 16, d: 12, h: 7, bedrooms: 3, home: true },
  guest: { label: 'Guest house', w: 10, d: 8, h: 5, bedrooms: 1, home: true },
  hall: { label: 'Gathering hall', w: 26, d: 18, h: 9, bedrooms: 0, home: false },
  workshop: { label: 'Workshop', w: 14, d: 10, h: 6, bedrooms: 0, home: false },
  garage: { label: 'Garage', w: 12, d: 8, h: 4, bedrooms: 0, home: false },
  pavilion: { label: 'Fire circle pavilion', w: 10, d: 10, h: 4, bedrooms: 0, home: false },
};

// Local template frame: origin at the parcel center, +y points away from the road.
export const TEMPLATES = [
  {
    id: 'courtyard-ring', name: 'Courtyard Ring',
    blurb: 'Homes around a shared courtyard with a fire circle in the middle',
    buildings: [
      { type: 'main', x: 0, y: 40, rot: 0 },
      { type: 'home', x: -38, y: 10, rot: Math.PI / 2 },
      { type: 'home', x: 38, y: 10, rot: -Math.PI / 2 },
      { type: 'guest', x: -26, y: -24, rot: 0 },
      { type: 'garage', x: 26, y: -26, rot: 0 },
      { type: 'pavilion', x: 0, y: 6, rot: 0 },
    ],
  },
  {
    id: 'ranch-row', name: 'Ranch Row',
    blurb: 'A row of homes facing the view, workshop and barn behind',
    buildings: [
      { type: 'home', x: -48, y: 0, rot: 0 },
      { type: 'main', x: -16, y: 0, rot: 0 },
      { type: 'home', x: 16, y: 0, rot: 0 },
      { type: 'home', x: 48, y: 0, rot: 0 },
      { type: 'workshop', x: -24, y: 44, rot: 0 },
      { type: 'garage', x: 24, y: 44, rot: 0 },
    ],
  },
  {
    id: 'hillside-terrace', name: 'Hillside Terrace',
    blurb: 'Homes stepped back in two terraces so every porch sees the springs',
    buildings: [
      { type: 'home', x: -36, y: -20, rot: 0 },
      { type: 'home', x: 0, y: -20, rot: 0 },
      { type: 'home', x: 36, y: -20, rot: 0 },
      { type: 'main', x: -20, y: 30, rot: 0 },
      { type: 'guest', x: 20, y: 30, rot: 0 },
    ],
  },
  {
    id: 'multi-generation', name: 'Multi-Generation Cluster',
    blurb: 'Elders, parents and young families together around a gathering hall',
    buildings: [
      { type: 'hall', x: 0, y: 10, rot: 0 },
      { type: 'main', x: -42, y: 40, rot: 0 },
      { type: 'home', x: 40, y: 42, rot: 0 },
      { type: 'home', x: -44, y: -18, rot: 0 },
      { type: 'home', x: 44, y: -18, rot: 0 },
      { type: 'guest', x: -14, y: -36, rot: 0 },
      { type: 'guest', x: 14, y: -36, rot: 0 },
    ],
  },
  {
    id: 'estate-manor', name: 'Estate Manor',
    blurb: 'One large main house with a guest house, garage and workshop',
    buildings: [
      { type: 'main', x: 0, y: 24, rot: 0 },
      { type: 'guest', x: -36, y: -6, rot: Math.PI / 2 },
      { type: 'garage', x: 34, y: -6, rot: 0 },
      { type: 'workshop', x: 34, y: 50, rot: 0 },
    ],
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id);

export const DEFAULT_RULES = { setback: 15, springBuffer: 60, minGap: 4 };

// A placeholder site until the real boundary and coordinates arrive.
export function makeSite(opts = {}) {
  const width = opts.width ?? 1400;
  const depth = opts.depth ?? 800;
  const estates = opts.estates ?? 12;
  const roadWidth = opts.roadWidth ?? 12;
  const preserveWidth = opts.preserveWidth ?? 260;
  const x0 = -width / 2, x1 = width / 2, y0 = -depth / 2, y1 = depth / 2;
  const lotsEnd = x1 - preserveWidth;
  const perRow = Math.ceil(estates / 2);
  const lotW = (lotsEnd - x0) / perRow;
  const parcels = [];
  for (let i = 0; i < estates; i++) {
    const north = i < perRow;
    const col = north ? i : i - perRow;
    const px0 = x0 + col * lotW;
    const rect = north
      ? { x0: px0, y0: roadWidth / 2, x1: px0 + lotW, y1 }
      : { x0: px0, y0, x1: px0 + lotW, y1: -roadWidth / 2 };
    parcels.push(makeParcel(`E${i + 1}`, `Estate ${i + 1}`, rect, north ? 0 : Math.PI));
  }
  const preserve = { x0: lotsEnd, y0, x1, y1 };
  return {
    format: FORMAT,
    version: VERSION,
    site: {
      name: opts.name ?? "Naka'tu Springs",
      origin: { lat: opts.lat ?? null, lon: opts.lon ?? null, height: 0 },
      boundary: { x0, y0, x1, y1 },
      road: { width: roadWidth, points: [[x0, 0], [lotsEnd + 40, 0]] },
      spring: { name: 'The Springs', x: (lotsEnd + x1) / 2, y: 40, radius: 45 },
      preserve,
    },
    rules: { ...DEFAULT_RULES, ...(opts.rules || {}) },
    parcels,
    compounds: [],
  };
}

function makeParcel(id, name, rect, facing) {
  return {
    id, name, family: '', facing, ...rect,
    acres: round(acres((rect.x1 - rect.x0) * (rect.y1 - rect.y0)), 1),
  };
}

const round = (v, n = 0) => Math.round(v * 10 ** n) / 10 ** n;
const uid = (prefix, list) => {
  let n = list.length + 1;
  while (list.some((x) => x.id === `${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};

export const parcelById = (design, id) => design.parcels.find((p) => p.id === id);
export const compoundOnParcel = (design, parcelId) => design.compounds.find((c) => c.parcelId === parcelId);
export const parcelCenter = (p) => ({ x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 });

export function newBuilding(type, x = 0, y = 0, rot = 0, id = 'B1') {
  const t = BUILDING_TYPES[type];
  if (!t) throw new Error(`unknown building type ${type}`);
  return { id, type, x, y, rot, w: t.w, d: t.d, h: t.h, bedrooms: t.bedrooms };
}

// Drops a template on a parcel. Any compound already there is replaced.
export function placeCompound(design, parcelId, templateId) {
  const parcel = parcelById(design, parcelId);
  const tpl = templateById(templateId);
  if (!parcel) throw new Error(`no parcel ${parcelId}`);
  if (!tpl) throw new Error(`no template ${templateId}`);
  design.compounds = design.compounds.filter((c) => c.parcelId !== parcelId);
  const compound = {
    id: `C-${parcelId}`, parcelId, templateId, rotation: 0,
    buildings: tpl.buildings.map((b, i) => newBuilding(b.type, b.x, b.y, b.rot, `B${i + 1}`)),
  };
  design.compounds.push(compound);
  return compound;
}

export function removeCompound(design, parcelId) {
  design.compounds = design.compounds.filter((c) => c.parcelId !== parcelId);
}

export function addBuilding(design, compound, type) {
  const b = newBuilding(type, 0, 0, 0, uid('B', compound.buildings));
  compound.buildings.push(b);
  return b;
}

export function setBuildingType(b, type) {
  const t = BUILDING_TYPES[type];
  Object.assign(b, { type, w: t.w, d: t.d, h: t.h, bedrooms: t.bedrooms });
}

// Compound-local to site coordinates.
export function compoundFrame(design, compound) {
  const p = parcelById(design, compound.parcelId);
  const c = parcelCenter(p);
  return { cx: c.x, cy: c.y, angle: p.facing + (compound.rotation || 0) };
}

export function toWorld(frame, x, y) {
  const s = Math.sin(frame.angle), c = Math.cos(frame.angle);
  return { x: frame.cx + x * c - y * s, y: frame.cy + x * s + y * c };
}

export function toLocal(frame, x, y) {
  const dx = x - frame.cx, dy = y - frame.cy;
  const s = Math.sin(frame.angle), c = Math.cos(frame.angle);
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

export function buildingWorld(design, compound, b) {
  const f = compoundFrame(design, compound);
  const p = toWorld(f, b.x, b.y);
  return { x: p.x, y: p.y, rot: f.angle + b.rot, w: b.w, d: b.d, h: b.h };
}

export function footprint(w) {
  const s = Math.sin(w.rot), c = Math.cos(w.rot);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => {
    const lx = (i * w.w) / 2, ly = (j * w.d) / 2;
    return [w.x + lx * c - ly * s, w.y + lx * s + ly * c];
  });
}

function overlaps(a, b, gap = 0) {
  // Separating axis test on two rotated rectangles, each grown by gap / 2.
  const grow = (w) => ({ ...w, w: w.w + gap, d: w.d + gap });
  const pa = footprint(grow(a)), pb = footprint(grow(b));
  for (const poly of [pa, pb]) {
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 4];
      const nx = y2 - y1, ny = x1 - x2;
      const proj = (pts) => pts.map(([x, y]) => x * nx + y * ny);
      const A = proj(pa), B = proj(pb);
      if (Math.max(...A) <= Math.min(...B) || Math.max(...B) <= Math.min(...A)) return false;
    }
  }
  return true;
}

// Returns one entry per problem: { compoundId, buildingId, rule, message }.
export function checkRules(design) {
  const { setback, springBuffer, minGap } = design.rules;
  const spring = design.site.spring;
  const issues = [];
  for (const c of design.compounds) {
    const p = parcelById(design, c.parcelId);
    const worlds = c.buildings.map((b) => buildingWorld(design, c, b));
    c.buildings.forEach((b, i) => {
      const label = `${BUILDING_TYPES[b.type]?.label ?? b.type} ${b.id}`;
      const pts = footprint(worlds[i]);
      const inside = pts.every(([x, y]) => x >= p.x0 + setback && x <= p.x1 - setback && y >= p.y0 + setback && y <= p.y1 - setback);
      if (!inside) issues.push({ compoundId: c.id, buildingId: b.id, rule: 'setback', message: `${label} is closer than ${setback} m to the ${p.name} line` });
      const near = Math.min(...pts.map(([x, y]) => Math.hypot(x - spring.x, y - spring.y))) - spring.radius;
      if (near < springBuffer) issues.push({ compoundId: c.id, buildingId: b.id, rule: 'spring', message: `${label} is ${Math.max(0, Math.round(near))} m from the springs (keep ${springBuffer} m)` });
      for (let j = i + 1; j < c.buildings.length; j++) {
        if (overlaps(worlds[i], worlds[j], minGap)) {
          issues.push({ compoundId: c.id, buildingId: b.id, rule: 'gap', message: `${label} is within ${minGap} m of ${c.buildings[j].id}` });
        }
      }
    });
  }
  return issues;
}

export function stats(design) {
  const b = design.site.boundary;
  const siteArea = (b.x1 - b.x0) * (b.y1 - b.y0);
  let homes = 0, bedrooms = 0, buildings = 0, roof = 0;
  for (const c of design.compounds) {
    for (const x of c.buildings) {
      buildings++;
      if (BUILDING_TYPES[x.type]?.home) homes++;
      bedrooms += x.bedrooms || 0;
      roof += x.w * x.d;
    }
  }
  const pts = design.site.road.points;
  let road = 0;
  for (let i = 1; i < pts.length; i++) road += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const paved = road * design.site.road.width;
  return {
    siteAcres: round(acres(siteArea), 1),
    estates: design.parcels.length,
    compounds: design.compounds.length,
    buildings, homes, bedrooms,
    roofSqm: Math.round(roof),
    roadM: Math.round(road),
    openSpacePct: round(100 * (1 - (roof + paved) / siteArea), 1),
  };
}

// Site meters to WGS84 degrees, a flat-earth approximation that is accurate to
// well under a meter across a site of a few kilometers.
export function toLatLon(origin, x, y) {
  const mLat = 111320;
  const mLon = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  return [round(origin.lon + x / mLon, 7), round(origin.lat + y / mLat, 7)];
}

export function toGeoJSON(design) {
  const o = design.site.origin;
  if (typeof o.lat !== 'number' || typeof o.lon !== 'number') throw new Error('Set the site latitude and longitude first');
  const ll = (x, y) => toLatLon(o, x, y);
  const rect = (r) => [[ll(r.x0, r.y0), ll(r.x1, r.y0), ll(r.x1, r.y1), ll(r.x0, r.y1), ll(r.x0, r.y0)]];
  const features = [
    { type: 'Feature', properties: { kind: 'site', name: design.site.name }, geometry: { type: 'Polygon', coordinates: rect(design.site.boundary) } },
    { type: 'Feature', properties: { kind: 'road', width: design.site.road.width }, geometry: { type: 'LineString', coordinates: design.site.road.points.map(([x, y]) => ll(x, y)) } },
    { type: 'Feature', properties: { kind: 'spring', name: design.site.spring.name, radius: design.site.spring.radius }, geometry: { type: 'Point', coordinates: ll(design.site.spring.x, design.site.spring.y) } },
  ];
  for (const p of design.parcels) {
    features.push({ type: 'Feature', properties: { kind: 'estate', id: p.id, name: p.name, family: p.family, acres: p.acres }, geometry: { type: 'Polygon', coordinates: rect(p) } });
  }
  for (const c of design.compounds) {
    for (const b of c.buildings) {
      const pts = footprint(buildingWorld(design, c, b)).map(([x, y]) => ll(x, y));
      features.push({
        type: 'Feature',
        properties: { kind: 'building', estate: c.parcelId, id: b.id, type: b.type, bedrooms: b.bedrooms, height: b.h },
        geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// Adds world placements so Unreal can spawn buildings without redoing the math.
export function toUnreal(design) {
  return {
    ...structuredClone(design),
    placements: design.compounds.flatMap((c) => c.buildings.map((b) => {
      const w = buildingWorld(design, c, b);
      return { estate: c.parcelId, id: b.id, type: b.type, x: round(w.x, 3), y: round(w.y, 3), yawDeg: round((w.rot * 180) / Math.PI, 3), w: b.w, d: b.d, h: b.h };
    })),
  };
}

export function parseDesign(text) {
  const d = typeof text === 'string' ? JSON.parse(text) : text;
  if (d?.format !== FORMAT) throw new Error('This is not a Naka\'tu Springs design file');
  if (d.version > VERSION) throw new Error('This design was saved by a newer version');
  for (const key of ['site', 'parcels', 'compounds', 'rules']) if (!d[key]) throw new Error(`Design is missing ${key}`);
  d.rules = { ...DEFAULT_RULES, ...d.rules };
  delete d.placements;
  return d;
}
