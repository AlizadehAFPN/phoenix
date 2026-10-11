/**
 * Where the sun is, for a date and a Zulu time.
 *
 * The page's clock drives the globe's terminator (STORYBOARD §1), so the
 * subsolar point has to be right for the day the page lives on: a pre-dawn
 * hero at Istanbul at 02:10Z is only honest if the sun really is below the
 * horizon there at 02:10Z on 2026-09-26, and leg 1 only "takes off into the
 * sunrise" if sunrise really is around 03:58Z.
 *
 * The formulas are the NOAA solar-position approximations (Spencer, 1971) for
 * declination and the equation of time. They are accurate to about 0.1°,
 * which is far below anything the terminator's soft edge can show.
 */

import { toVector, type GeoPoint, type Vec3 } from "./geo";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Minutes after midnight UTC for an `HH:MM` string. */
export function parseClock(clock: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(clock);
  if (match === null) throw new Error(`not an HH:MM clock: "${clock}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** `HH:MM` for a number of minutes after midnight, wrapping at 24 h. */
export function formatClock(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Day of year, 1-based, for an ISO `YYYY-MM-DD` date. */
export function dayOfYear(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) throw new Error(`not an ISO date: "${isoDate}"`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.round((current - start) / 86_400_000) + 1;
}

export interface SunPosition {
  /** Declination, degrees. */
  readonly declination: number;
  /** Equation of time, minutes. Positive when the sundial runs ahead. */
  readonly equationOfTime: number;
  /** The point on Earth where the sun is at the zenith. */
  readonly subsolar: GeoPoint;
}

/**
 * The subsolar point for a date and a time in minutes after midnight UTC.
 *
 * Solar noon is wherever local solar time is 12:00, and local solar time is
 * UTC + longitude/15 h + equation of time — so the subsolar longitude is
 * `15·(12 − UTC hours) − EoT/4` degrees. The declination is the subsolar
 * latitude.
 */
export function sunPosition(isoDate: string, minutesUtc: number): SunPosition {
  const hours = minutesUtc / 60;
  const gamma =
    ((2 * Math.PI) / 365) * (dayOfYear(isoDate) - 1 + (hours - 12) / 24);

  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const declination =
    (0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma)) *
    RAD;

  let lon = 15 * (12 - hours) - equationOfTime / 4;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;

  return { declination, equationOfTime, subsolar: { lat: declination, lon } };
}

/** Unit vector toward the sun, in the globe's frame. */
export function sunDirection(isoDate: string, minutesUtc: number): Vec3 {
  return toVector(sunPosition(isoDate, minutesUtc).subsolar);
}

/**
 * The sun's elevation above the horizon at a point, in degrees. Negative is
 * below the horizon. Geometric, without refraction: sunrise by the usual
 * definition is at about −0.83°.
 */
export function sunElevation(
  isoDate: string,
  minutesUtc: number,
  at: GeoPoint,
): number {
  const sun = sunDirection(isoDate, minutesUtc);
  const point = toVector(at);
  const cosZenith = sun[0] * point[0] + sun[1] * point[1] + sun[2] * point[2];
  return Math.asin(Math.min(1, Math.max(-1, cosZenith))) * RAD;
}

/** Keeps the constant used by one caller visible for the tests. */
export const DEG_TO_RAD = DEG;
