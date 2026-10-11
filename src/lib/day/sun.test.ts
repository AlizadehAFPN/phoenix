import { describe, expect, it } from "vitest";

import { AIRPORTS } from "@/data/airports";

import {
  dayOfYear,
  formatClock,
  parseClock,
  sunElevation,
  sunPosition,
} from "./sun";

const DATE = "2026-09-26";

describe("clock strings", () => {
  it("parses and formats HH:MM", () => {
    expect(parseClock("03:55")).toBe(235);
    expect(formatClock(235)).toBe("03:55");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(1440 + 70)).toBe("01:10");
    expect(() => parseClock("3:55")).toThrow();
  });

  it("counts the day of year", () => {
    expect(dayOfYear("2026-01-01")).toBe(1);
    expect(dayOfYear(DATE)).toBe(269);
    expect(dayOfYear("2024-12-31")).toBe(366);
  });
});

describe("the sun on 2026-09-26", () => {
  it("is just south of the equator, with the sundial a few minutes fast", () => {
    const sun = sunPosition(DATE, 12 * 60);
    expect(sun.declination).toBeGreaterThan(-2);
    expect(sun.declination).toBeLessThan(-0.5);
    expect(sun.equationOfTime).toBeGreaterThan(7);
    expect(sun.equationOfTime).toBeLessThan(11);
    /* Solar noon at 12:00Z is a little west of Greenwich when the sundial
       runs fast. */
    expect(sun.subsolar.lon).toBeLessThan(0);
    expect(sun.subsolar.lon).toBeGreaterThan(-4);
  });

  it("rises at Istanbul at about 03:58Z, so the hero is before dawn and leg 1 takes off at sunrise", () => {
    const ist = AIRPORTS.IST;
    /* Published sunrise for Istanbul on that date is about 06:58 local
       (UTC+3). Geometric sunrise is at −0.83°; allow a few minutes either way. */
    expect(
      Math.abs(sunElevation(DATE, parseClock("03:58"), ist) + 0.83),
    ).toBeLessThan(1.5);
    /* The hero at 02:10Z: full night at Istanbul itself, the sun about 20°
       below the horizon. The dawn glow the hero shows is on the eastern limb,
       where the terminator lies some 26° east, not in Istanbul's own sky. */
    const hero = sunElevation(DATE, parseClock("02:10"), ist);
    expect(hero).toBeLessThan(-12);
    expect(hero).toBeGreaterThan(-30);
    /* Sign-out at 12:30Z is mid-afternoon, not dusk. */
    expect(sunElevation(DATE, parseClock("12:30"), ist)).toBeGreaterThan(25);
  });

  it("sets at Istanbul around 16:00Z", () => {
    const ist = AIRPORTS.IST;
    expect(
      Math.abs(sunElevation(DATE, parseClock("16:00"), ist) + 0.83),
    ).toBeLessThan(2);
  });
});
