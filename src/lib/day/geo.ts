/**
 * Spherical geometry for the globe: lat/lon to unit vectors, great circles
 * and angular distances. Pure math, no three.js, so the day's route can be
 * unit-tested and the same functions drive the scene, the markers and the
 * tests that check them.
 *
 * FRAME. The globe is a three.js `SphereGeometry` with an equirectangular
 * texture, Y up. For that geometry `u = 0.5` (longitude 0) lands on +X and
 * longitude 90°E on −Z, so a point on the sphere is
 *
 *   x = cos(lat)·cos(lon)   y = sin(lat)   z = −cos(lat)·sin(lon)
 *
 * Every conversion goes through `toVector` so that fact lives in one place.
 */

export interface GeoPoint {
  /** Degrees, north positive. */
  readonly lat: number;
  /** Degrees, east positive. */
  readonly lon: number;
}

export type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Unit vector for a point on the sphere, in the globe's frame. */
export function toVector(point: GeoPoint): Vec3 {
  const lat = point.lat * DEG;
  const lon = point.lon * DEG;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon)];
}

/** The inverse of `toVector` for a unit (or any non-zero) vector. */
export function toGeo(v: Vec3): GeoPoint {
  const [x, y, z] = v;
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(y / r) * RAD, lon: Math.atan2(-z, x) * RAD };
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function normalize(v: Vec3): Vec3 {
  const r = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / r, v[1] / r, v[2] / r];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * The angle between two points on the sphere, in radians — the great-circle
 * distance on a unit sphere. Via the haversine formula, which is stable at
 * both very small and near-antipodal separations, unlike the plain spherical
 * law of cosines. The same formula the app's `src/geo/great-circle.ts` uses.
 */
export function angularDistance(from: GeoPoint, to: GeoPoint): number {
  const lat1 = from.lat * DEG;
  const lat2 = to.lat * DEG;
  const dLat = lat2 - lat1;
  const dLon = (to.lon - from.lon) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The point a fraction `f` of the way along the great circle from `from` to
 * `to`, as a unit vector — spherical linear interpolation. Returned as a
 * vector rather than lat/lon because the scene consumes vectors, and the
 * round trip through `atan2` is where a marker drifts off its airport.
 *
 * Coincident or antipodal endpoints have no unique arc; both degenerate cases
 * return `from`, so a bad airport lookup draws nothing rather than NaN.
 */
export function slerp(from: GeoPoint, to: GeoPoint, f: number): Vec3 {
  const a = toVector(from);
  const b = toVector(to);
  const angle = Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
  if (angle < 1e-9 || Math.PI - angle < 1e-9) return a;
  if (f <= 0) return a;
  if (f >= 1) return b;
  const sa = Math.sin((1 - f) * angle) / Math.sin(angle);
  const sb = Math.sin(f * angle) / Math.sin(angle);
  return normalize(add(scale(a, sa), scale(b, sb)));
}

/** Earth's mean radius in kilometres, for turning arc angles into distances. */
export const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in kilometres. */
export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  return angularDistance(from, to) * EARTH_RADIUS_KM;
}
