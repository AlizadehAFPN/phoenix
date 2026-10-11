/**
 * The duty day the page tells (STORYBOARD §2).
 *
 * PURE DATA. The route, the times and the duty window are configuration, so a
 * white-label variant — or capture day, when the day has to agree with the
 * roster the test account shows (STORYBOARD §9) — changes a config file and
 * the globe, the clock and the duty bar follow without a code change.
 *
 * Every time is Zulu, as an `HH:MM` string, on the page's one date. The app
 * displays Zulu everywhere and so does the page.
 */

import { AIRPORTS, type Airport, type AirportCode } from "@/data/airports";

import { parseClock } from "./sun";

export interface Leg {
  readonly from: AirportCode;
  readonly to: AirportCode;
  /** The four OOOI times, Zulu. */
  readonly offBlock: string;
  readonly takeOff: string;
  readonly landing: string;
  readonly onBlocks: string;
  /**
   * The fuel reading captured with each time, in kilograms. Design data for
   * the readout: plausible narrow-body figures, not a measurement.
   */
  readonly fuelKg: {
    readonly offBlock: number;
    readonly takeOff: number;
    readonly landing: number;
    readonly onBlocks: number;
  };
}

export interface Day {
  /** ISO date; the capture date, so the screens and the sun agree. */
  readonly date: string;
  /** Report time, Zulu. The duty bar starts here. */
  readonly report: string;
  /** Sign-out, Zulu. The clock holds here for the rest of the page. */
  readonly signOut: string;
  /** The maximum FDP for this report time and sector count, Zulu. */
  readonly dutyLimit: string;
  readonly legs: readonly Leg[];
}

/**
 * The generic day: IST → CAI → AMM → IST on 2026-09-26.
 *
 * Chosen so the real terminator makes the hero genuinely pre-dawn at Istanbul
 * (sunrise about 03:58Z) and leg 1 takes off at sunrise; three major public
 * hubs that point at no airline's network. The 05:40 local report with three
 * sectors gives a 12:00 maximum FDP under the published EASA table, hence the
 * 14:40Z limit; the actual FDP, report to on-blocks, is 9 h 18.
 */
export const GENERIC_DAY: Day = {
  date: "2026-09-26",
  report: "02:40",
  signOut: "12:30",
  dutyLimit: "14:40",
  legs: [
    {
      from: "IST",
      to: "CAI",
      offBlock: "03:40",
      takeOff: "03:55",
      landing: "05:50",
      onBlocks: "05:58",
      fuelKg: { offBlock: 8900, takeOff: 8650, landing: 4150, onBlocks: 4000 },
    },
    {
      from: "CAI",
      to: "AMM",
      offBlock: "06:55",
      takeOff: "07:10",
      landing: "08:25",
      onBlocks: "08:32",
      fuelKg: { offBlock: 6800, takeOff: 6600, landing: 4100, onBlocks: 4000 },
    },
    {
      from: "AMM",
      to: "IST",
      offBlock: "09:30",
      takeOff: "09:45",
      landing: "11:50",
      onBlocks: "11:58",
      fuelKg: { offBlock: 8700, takeOff: 8450, landing: 3900, onBlocks: 3750 },
    },
  ],
};

export function airport(code: AirportCode): Airport {
  return AIRPORTS[code];
}

/** A leg's four times in minutes after midnight UTC. */
export function legMinutes(leg: Leg): {
  readonly offBlock: number;
  readonly takeOff: number;
  readonly landing: number;
  readonly onBlocks: number;
} {
  return {
    offBlock: parseClock(leg.offBlock),
    takeOff: parseClock(leg.takeOff),
    landing: parseClock(leg.landing),
    onBlocks: parseClock(leg.onBlocks),
  };
}

/** Every distinct airport the day touches, in first-seen order. */
export function dayAirports(day: Day): readonly Airport[] {
  const seen = new Set<AirportCode>();
  const out: Airport[] = [];
  for (const leg of day.legs) {
    for (const code of [leg.from, leg.to]) {
      if (seen.has(code)) continue;
      seen.add(code);
      out.push(AIRPORTS[code]);
    }
  }
  return out;
}

/**
 * Checks the day is physically consistent: times in order within a leg, legs
 * in order, each leg starting where the last one ended, and the duty window
 * containing all of it. Thrown at module load in development and asserted in
 * the tests, so a config edit on capture day cannot ship an impossible day.
 */
export function validateDay(day: Day): void {
  const report = parseClock(day.report);
  const signOut = parseClock(day.signOut);
  const limit = parseClock(day.dutyLimit);
  if (!(report < signOut && signOut <= limit)) {
    throw new Error("day: report < sign-out <= duty limit must hold");
  }

  let previousEnd = report;
  let previousTo: AirportCode | null = null;
  day.legs.forEach((leg, index) => {
    const t = legMinutes(leg);
    if (!(
      t.offBlock < t.takeOff &&
      t.takeOff < t.landing &&
      t.landing < t.onBlocks
    )) {
      throw new Error(
        `day: leg ${String(index + 1)} times are not in OOOI order`,
      );
    }
    if (t.offBlock <= previousEnd) {
      throw new Error(
        `day: leg ${String(index + 1)} starts before the previous one ends`,
      );
    }
    if (previousTo !== null && leg.from !== previousTo) {
      throw new Error(
        `day: leg ${String(index + 1)} does not start where leg ${String(index)} ended`,
      );
    }
    if (leg.from === leg.to) {
      throw new Error(`day: leg ${String(index + 1)} goes nowhere`);
    }
    const f = leg.fuelKg;
    if (!(
      f.offBlock >= f.takeOff &&
      f.takeOff > f.landing &&
      f.landing >= f.onBlocks
    )) {
      throw new Error(
        `day: leg ${String(index + 1)} fuel does not fall through the leg`,
      );
    }
    previousEnd = t.onBlocks;
    previousTo = leg.to;
  });

  if (previousEnd >= signOut) {
    throw new Error("day: the last leg ends after sign-out");
  }
}
