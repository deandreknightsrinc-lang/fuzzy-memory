// Polygon helpers and boundary import. Polygons are arrays of [x, y] in site meters
// (x east, y north), counterclockwise, without a repeated closing point.

const M_PER_DEG = 111320;

export function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function centroid(poly) {
  const a = polyArea(poly);
  if (Math.abs(a) < 1e-9) {
    const n = poly.length || 1;
    return { x: poly.reduce((s, p) => s + p[0], 0) / n, y: poly.reduce((s, p) => s + p[1], 0) / n };
  }
  let cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function bbox(poly) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export const rectPoly = (r) => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];

export function ccw(poly) {
  const p = dedupe(poly);
  return polyArea(p) < 0 ? p.reverse() : p;
}

function dedupe(poly) {
  const out = [];
  for (const p of poly) {
    const q = out.at(-1);
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) out.push([p[0], p[1]]);
  }
  if (out.length > 1 && Math.hypot(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) <= 1e-6) out.pop();
  return out;
}

export function rotate(poly, angle) {
  const s = Math.sin(angle), c = Math.cos(angle);
  return poly.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

// Keeps the part of poly where nx * x + ny * y >= k (Sutherland-Hodgman, one edge).
function clipHalfPlane(poly, nx, ny, k) {
  const out = [];
  const side = ([x, y]) => nx * x + ny * y - k;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

export function clipRect(poly, r) {
  let p = poly;
  p = clipHalfPlane(p, 1, 0, r.x0);
  p = clipHalfPlane(p, -1, 0, -r.x1);
  p = clipHalfPlane(p, 0, 1, r.y0);
  p = clipHalfPlane(p, 0, -1, -r.y1);
  return p.length >= 3 ? dedupe(p) : [];
}

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToEdges(x, y, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

// Turn angle that lines the polygon's long side up with the x axis.
export function longAxisAngle(poly) {
  let best = 0, bestRatio = -1;
  for (let deg = 0; deg < 180; deg += 2) {
    const a = (deg * Math.PI) / 180;
    const b = bbox(rotate(poly, -a));
    const ratio = (b.x1 - b.x0) / Math.max(1e-9, b.y1 - b.y0);
    if (ratio > bestRatio + 1e-9) { bestRatio = ratio; best = a; }
  }
  return best;
}

export function toLatLon(origin, x, y) {
  const mLon = M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180);
  return [Math.round((origin.lon + x / mLon) * 1e7) / 1e7, Math.round((origin.lat + y / M_PER_DEG) * 1e7) / 1e7];
}

export function fromLatLon(origin, lon, lat) {
  const mLon = M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180);
  return [(lon - origin.lon) * mLon, (lat - origin.lat) * M_PER_DEG];
}

// The largest outer ring in a GeoJSON or KML file, as [lon, lat] pairs.
export function parseBoundary(text) {
  const t = String(text).trim();
  const rings = t.startsWith('<') ? kmlRings(t) : geojsonRings(JSON.parse(t));
  const good = rings.filter((r) => r.length >= 3 && r.every(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180));
  if (!good.length) throw new Error('No boundary shape found. Draw the site as a polygon in Google Earth or My Maps and export it as KML.');
  const size = (r) => {
    const o = { lat: r[0][1], lon: r[0][0] };
    return Math.abs(polyArea(r.map(([lon, lat]) => fromLatLon(o, lon, lat))));
  };
  return good.reduce((a, b) => (size(b) > size(a) ? b : a));
}

function kmlRings(xml) {
  const rings = [];
  for (const poly of xml.match(/<(?:\w+:)?Polygon[\s\S]*?<\/(?:\w+:)?Polygon>/g) || []) {
    const outer = poly.match(/<(?:\w+:)?outerBoundaryIs[\s\S]*?<(?:\w+:)?coordinates>([\s\S]*?)<\/(?:\w+:)?coordinates>/)
      || poly.match(/<(?:\w+:)?coordinates>([\s\S]*?)<\/(?:\w+:)?coordinates>/);
    if (!outer) continue;
    rings.push(outer[1].trim().split(/\s+/).map((tuple) => tuple.split(',').slice(0, 2).map(Number)));
  }
  return rings;
}

function geojsonRings(g) {
  if (!g || typeof g !== 'object') return [];
  switch (g.type) {
    case 'FeatureCollection': return (g.features || []).flatMap(geojsonRings);
    case 'Feature': return geojsonRings(g.geometry);
    case 'GeometryCollection': return (g.geometries || []).flatMap(geojsonRings);
    case 'Polygon': return g.coordinates?.[0] ? [g.coordinates[0].map((p) => p.slice(0, 2))] : [];
    case 'MultiPolygon': return (g.coordinates || []).map((poly) => poly[0].map((p) => p.slice(0, 2)));
    default: return [];
  }
}
