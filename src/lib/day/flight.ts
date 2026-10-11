/**
 * Where the aircraft is at a given Zulu time (STORYBOARD §1: the clock drives
 * the flight).
 *
 * The head of the line is literally where the aircraft is at that minute:
 * at the gate before off-block, on the ground until take-off, along the
 * great circle between take-off and landing, on the ground again until
 * on-blocks, and at the arrival gate until the next leg. Because the page's
 * clock is the only input, the scene can never show the aircraft somewhere
 * the roster says it is not.
 */

import type { Airport } from "@/data/airports";

import { airport, legMinutes, type Day, type Leg } from "./day";
import { slerp, type Vec3 } from "./geo";
import { parseClock } from "./sun";

export type FlightPhase =
  /** Before the first off-block: at the first departure gate. */
  | "before"
  /** Off-block to take-off: on the ground at the departure airport. */
  | "taxi-out"
  /** Take-off to landing. */
  | "airborne"
  /** Landing to on-blocks: on the ground at the arrival airport. */
  | "taxi-in"
  /** On-blocks to the next off-block: at the arrival gate. */
  | "turnaround"
  /** After the last on-blocks. */
  | "after";

export interface FlightState {
  /** Index into `day.legs` of the leg in progress or last completed. */
  readonly legIndex: number;
  readonly phase: FlightPhase;
  /** 0 at take-off, 1 at landing; 0 on the ground before, 1 after. */
  readonly fraction: number;
  /** Position on the unit sphere. */
  readonly position: Vec3;
  /** Height above the surface as a fraction of the radius, 0 on the ground. */
  readonly altitude: number;
  readonly from: Airport;
  readonly to: Airport;
}

/**
 * Cruise altitude as a fraction of the globe's radius. A real airliner at
 * 11 km is 0.0017 R, invisible at any camera distance that shows a route, so
 * the line flies at a height that reads, the way a flight-tracking map does.
 */
export const CRUISE_ALTITUDE = 0.035;

/** The share of a leg spent climbing, and the share spent descending. */
const CLIMB_SHARE = 0.18;
const DESCENT_SHARE = 0.22;

/**
 * Height above the surface along a leg: a smooth climb, a flat cruise, a
 * slightly longer descent. Smoothstep ends, so the line leaves and meets the
 * ground tangentially rather than at a kink.
 */
export function altitudeAt(fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  const ease = (t: number) => t * t * (3 - 2 * t);
  if (f < CLIMB_SHARE) return CRUISE_ALTITUDE * ease(f / CLIMB_SHARE);
  if (f > 1 - DESCENT_SHARE)
    return CRUISE_ALTITUDE * ease((1 - f) / DESCENT_SHARE);
  return CRUISE_ALTITUDE;
}

function legState(
  day: Day,
  legIndex: number,
  leg: Leg,
  phase: FlightPhase,
  fraction: number,
): FlightState {
  const from = airport(leg.from);
  const to = airport(leg.to);
  const f = Math.min(1, Math.max(0, fraction));
  return {
    legIndex,
    phase,
    fraction: f,
    position: slerp(from, to, f),
    altitude: phase === "airborne" ? altitudeAt(f) : 0,
    from,
    to,
  };
}

/** The aircraft's state at `minutes` after midnight UTC on the day. */
export function flightAt(day: Day, minutes: number): FlightState {
  const first = day.legs[0];
  const last = day.legs[day.legs.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error("flightAt: the day has no legs");
  }

  if (minutes < parseClock(first.offBlock)) {
    return legState(day, 0, first, "before", 0);
  }

  for (let i = 0; i < day.legs.length; i += 1) {
    const leg = day.legs[i];
    if (leg === undefined) continue;
    const t = legMinutes(leg);
    const next = day.legs[i + 1];

    if (minutes < t.takeOff) return legState(day, i, leg, "taxi-out", 0);
    if (minutes < t.landing) {
      return legState(
        day,
        i,
        leg,
        "airborne",
        (minutes - t.takeOff) / (t.landing - t.takeOff),
      );
    }
    if (minutes < t.onBlocks) return legState(day, i, leg, "taxi-in", 1);
    if (next !== undefined && minutes < parseClock(next.offBlock)) {
      return legState(day, i, leg, "turnaround", 1);
    }
  }

  return legState(day, day.legs.length - 1, last, "after", 1);
}
