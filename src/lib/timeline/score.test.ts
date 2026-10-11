import { describe, expect, it } from "vitest";

import { GENERIC_DAY, legMinutes } from "@/lib/day/day";
import { flightAt } from "@/lib/day/flight";
import { formatClock, parseClock } from "@/lib/day/sun";

import { BEAT_IDS, BEATS } from "./beats";
import { clockAtEnd, clockAtStart, scoreAt } from "./score";

describe("the score", () => {
  it("lists every beat once, in order", () => {
    expect(BEATS.map((b) => b.id)).toEqual([...BEAT_IDS]);
  });

  it("has ascending segments that end at 1 in every beat", () => {
    for (const b of BEATS) {
      let previous = 0;
      for (const s of b.segments) {
        expect(s.until).toBeGreaterThan(previous);
        previous = s.until;
      }
      expect(previous).toBe(1);
    }
  });

  it("keeps the clock continuous across beats and never runs it backwards", () => {
    let clock = clockAtStart("hero");
    for (const b of BEATS) {
      expect(clockAtStart(b.id)).toBe(clock);
      for (const s of b.segments) {
        expect(parseClock(s.clock[1])).toBeGreaterThanOrEqual(
          parseClock(s.clock[0]),
        );
        clock = parseClock(s.clock[1]);
      }
    }
    expect(formatClock(clock)).toBe(GENERIC_DAY.signOut);
  });

  it("flies each leg inside the beat the storyboard gives it", () => {
    const leg1 = legMinutes(GENERIC_DAY.legs[0]!);
    const leg2 = legMinutes(GENERIC_DAY.legs[1]!);
    /* Beat 04: the whole of leg 1, gate to gate. */
    expect(clockAtStart("oooi")).toBeLessThanOrEqual(leg1.offBlock);
    expect(clockAtEnd("oooi")).toBe(leg1.onBlocks);
    /* Beat 06: the whole of leg 2. */
    expect(clockAtStart("signal")).toBeLessThanOrEqual(leg2.offBlock);
    expect(clockAtEnd("signal")).toBe(leg2.onBlocks);
    /* Beat 07 ends at sign-out, after leg 3. */
    expect(clockAtEnd("handover")).toBe(parseClock(GENERIC_DAY.signOut));
  });

  it("holds the clock on each OOOI event while its ring fills", () => {
    const leg1 = legMinutes(GENERIC_DAY.legs[0]!);
    const expected = {
      offBlock: leg1.offBlock,
      takeOff: leg1.takeOff,
      landing: leg1.landing,
      onBlocks: leg1.onBlocks,
    };
    const seen = new Set<string>();
    for (let p = 0; p <= 1; p += 0.001) {
      const s = scoreAt("oooi", p);
      if (s.ring === null) continue;
      seen.add(s.ring.event);
      expect(s.clock).toBe(expected[s.ring.event]);
      expect(s.ring.fill).toBeGreaterThanOrEqual(0);
      expect(s.ring.fill).toBeLessThanOrEqual(1);
    }
    expect([...seen].sort()).toEqual([
      "landing",
      "offBlock",
      "onBlocks",
      "takeOff",
    ]);
  });

  it("puts the aircraft where the clock says during the flight segments", () => {
    const mid = scoreAt("oooi", 0.5);
    expect(mid.kind).toBe("flight");
    const state = flightAt(GENERIC_DAY, mid.clock);
    expect(state.phase).toBe("airborne");
    expect(state.legIndex).toBe(0);
    const cruise = scoreAt("signal", 0.4);
    expect(flightAt(GENERIC_DAY, cruise.clock).legIndex).toBe(1);
  });

  it("steps through the six sector stations in order", () => {
    const steps = [];
    for (let p = 0.12; p <= 1; p += 0.01) steps.push(scoreAt("sector", p).step);
    expect(steps[0]).toBe(0);
    expect(steps[steps.length - 1]).toBe(5);
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!);
    }
  });

  it("gives the last track more than a screen, since its beat ends when the demo comes into view", () => {
    const tracks = BEATS.filter((b) => b.lengthVh > 0);
    const last = tracks[tracks.length - 1];
    expect(last?.id).toBe("regulatory");
    expect(last?.lengthVh ?? 0).toBeGreaterThan(100 + 40);
  });

  it("clamps progress", () => {
    expect(scoreAt("hero", -1).progress).toBe(0);
    expect(scoreAt("hero", 2).progress).toBe(1);
    expect(scoreAt("demo", 0.5).clock).toBe(parseClock("12:30"));
  });
});
