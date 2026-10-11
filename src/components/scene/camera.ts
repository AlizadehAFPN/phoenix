/**
 * Where the camera is, for a point in the score (STORYBOARD §4: each beat's
 * view, and the head-tracking views of the two flight beats).
 *
 * A beat's view is two anchors, eye and look, in geographic terms. Between
 * beats the camera travels from the previous beat's final pose to the new
 * one across the first quarter of the beat, on the app's `climb` curve, and
 * it travels on the SPHERE — direction by spherical interpolation, radius by
 * linear — so a long move never cuts through the globe or skims it.
 */

import { airport, type Day } from "@/lib/day/day";
import { flightAt } from "@/lib/day/flight";
import { normalize, scale, toGeo, toVector, type Vec3 } from "@/lib/day/geo";
import { ease } from "@/lib/motion/easing";
import {
  BEATS,
  type Anchor,
  type BeatId,
  type CameraView,
} from "@/lib/timeline/beats";
import { clockAtEnd } from "@/lib/timeline/score";

export interface Pose {
  readonly eye: Vec3;
  readonly look: Vec3;
  /** Screen anchor of the look point, fractions of the viewport. */
  readonly anchor: readonly [number, number];
}

/** The share of a beat over which the camera moves from the previous view. */
const TRAVEL_SHARE = 0.25;

function resolveAnchor(anchor: Anchor, day: Day, clock: number): Vec3 {
  if ("head" in anchor) {
    const state = flightAt(day, clock);
    const geo = toGeo(state.position);
    const direction = toVector({
      lat: geo.lat + anchor.dLat,
      lon: geo.lon + anchor.dLon,
    });
    return scale(direction, 1 + anchor.alt + state.altitude);
  }
  return scale(toVector(anchor), 1 + anchor.alt);
}

function viewPose(view: CameraView, day: Day, clock: number): Pose {
  return {
    eye: resolveAnchor(view.eye, day, clock),
    look: resolveAnchor(view.look, day, clock),
    anchor: view.anchor,
  };
}

/** Slerp of direction, lerp of radius. */
function travel(a: Vec3, b: Vec3, t: number): Vec3 {
  const ra = Math.hypot(a[0], a[1], a[2]);
  const rb = Math.hypot(b[0], b[1], b[2]);
  const da = normalize(a);
  const db = normalize(b);
  const cos = Math.min(
    1,
    Math.max(-1, da[0] * db[0] + da[1] * db[1] + da[2] * db[2]),
  );
  const angle = Math.acos(cos);
  let direction: Vec3;
  if (angle < 1e-6) {
    direction = da;
  } else {
    const sa = Math.sin((1 - t) * angle) / Math.sin(angle);
    const sb = Math.sin(t * angle) / Math.sin(angle);
    direction = normalize([
      da[0] * sa + db[0] * sb,
      da[1] * sa + db[1] * sb,
      da[2] * sa + db[2] * sb,
    ]);
  }
  return scale(direction, ra + (rb - ra) * t);
}

/** The camera pose for `progress` through beat `id`, at `clock`. */
export function poseAt(
  id: BeatId,
  progress: number,
  clock: number,
  day: Day,
): Pose {
  const index = BEATS.findIndex((b) => b.id === id);
  const current = BEATS[index];
  if (current === undefined) throw new Error(`unknown beat "${id}"`);
  const target = viewPose(current.view, day, clock);

  const previous = BEATS[index - 1];
  if (previous === undefined || progress >= TRAVEL_SHARE) return target;

  const from = viewPose(previous.view, day, clockAtEnd(previous.id));
  const t = ease("climb", progress / TRAVEL_SHARE);
  return {
    eye: travel(from.eye, target.eye, t),
    look: travel(from.look, target.look, t),
    anchor: [
      from.anchor[0] + (target.anchor[0] - from.anchor[0]) * t,
      from.anchor[1] + (target.anchor[1] - from.anchor[1]) * t,
    ],
  };
}

/** The first airport's position, for a scene that has not read the scroll yet. */
export function restingLook(day: Day): Vec3 {
  const first = day.legs[0];
  if (first === undefined) throw new Error("the day has no legs");
  return toVector(airport(first.from));
}
