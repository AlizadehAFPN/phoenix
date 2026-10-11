import { describe, expect, it } from "vitest";

import { AIRPORTS } from "@/data/airports";

import { dayAirports, GENERIC_DAY, validateDay } from "./day";
import { altitudeAt, CRUISE_ALTITUDE, flightAt } from "./flight";
import { angularDistance, distanceKm, slerp, toGeo, toVector } from "./geo";
import { parseClock } from "./sun";

describe("the generic day", () => {
  it("is physically consistent", () => {
    expect(() => validateDay(GENERIC_DAY)).not.toThrow();
    expect(dayAirports(GENERIC_DAY).map((a) => a.code)).toEqual([
      "IST",
      "CAI",
      "AMM",
    ]);
  });

  it("refuses an impossible day", () => {
    expect(() =>
      validateDay({
        ...GENERIC_DAY,
        legs: [{ ...GENERIC_DAY.legs[0]!, landing: "03:50" }],
      }),
    ).toThrow(/OOOI order/);
    expect(() =>
      validateDay({
        ...GENERIC_DAY,
        legs: [
          GENERIC_DAY.legs[0]!,
          { ...GENERIC_DAY.legs[1]!, from: "AMM", to: "IST" },
        ],
      }),
    ).toThrow(/does not start where/);
  });

  it("flies plausible distances at a plausible speed", () => {
    const leg1 = distanceKm(AIRPORTS.IST, AIRPORTS.CAI);
    expect(leg1).toBeGreaterThan(1200);
    expect(leg1).toBeLessThan(1300);
    /* 115 min airborne for ~1250 km is about 650 km/h: a narrow-body with
       climb and descent included. */
    const minutes = parseClock("05:50") - parseClock("03:55");
    expect((leg1 / minutes) * 60).toBeGreaterThan(550);
    expect((leg1 / minutes) * 60).toBeLessThan(800);
  });
});

describe("geometry", () => {
  it("maps longitude 0 to +X and 90°E to −Z", () => {
    const [x0, , z0] = toVector({ lat: 0, lon: 0 });
    expect(x0).toBeCloseTo(1);
    expect(z0).toBeCloseTo(0);
    const [x90, , z90] = toVector({ lat: 0, lon: 90 });
    expect(x90).toBeCloseTo(0);
    expect(z90).toBeCloseTo(-1);
    expect(toVector({ lat: 90, lon: 0 })[1]).toBeCloseTo(1);
  });

  it("round-trips through toGeo", () => {
    const p = toGeo(toVector(AIRPORTS.AMM));
    expect(p.lat).toBeCloseTo(AIRPORTS.AMM.lat, 6);
    expect(p.lon).toBeCloseTo(AIRPORTS.AMM.lon, 6);
  });

  it("interpolates along the great circle and lands exactly on the endpoints", () => {
    expect(slerp(AIRPORTS.IST, AIRPORTS.CAI, 0)).toEqual(
      toVector(AIRPORTS.IST),
    );
    expect(slerp(AIRPORTS.IST, AIRPORTS.CAI, 1)).toEqual(
      toVector(AIRPORTS.CAI),
    );
    const mid = toGeo(slerp(AIRPORTS.IST, AIRPORTS.CAI, 0.5));
    expect(angularDistance(AIRPORTS.IST, mid)).toBeCloseTo(
      angularDistance(mid, AIRPORTS.CAI),
      9,
    );
  });
});

describe("the aircraft's position by the clock", () => {
  it("sits at the first gate before off-block", () => {
    const s = flightAt(GENERIC_DAY, parseClock("02:10"));
    expect(s.phase).toBe("before");
    expect(s.legIndex).toBe(0);
    expect(s.position).toEqual(toVector(AIRPORTS.IST));
    expect(s.altitude).toBe(0);
  });

  it("is airborne halfway through leg 1 at 04:52 and a half", () => {
    const s = flightAt(
      GENERIC_DAY,
      (parseClock("03:55") + parseClock("05:50")) / 2,
    );
    expect(s.phase).toBe("airborne");
    expect(s.fraction).toBeCloseTo(0.5);
    expect(s.altitude).toBeCloseTo(CRUISE_ALTITUDE);
  });

  it("waits at Cairo between legs and ends at Istanbul", () => {
    const turn = flightAt(GENERIC_DAY, parseClock("06:20"));
    expect(turn.phase).toBe("turnaround");
    expect(turn.position).toEqual(toVector(AIRPORTS.CAI));
    const done = flightAt(GENERIC_DAY, parseClock("12:30"));
    expect(done.phase).toBe("after");
    expect(done.legIndex).toBe(2);
    expect(done.position).toEqual(toVector(AIRPORTS.IST));
  });

  it("climbs, cruises and descends smoothly", () => {
    expect(altitudeAt(0)).toBe(0);
    expect(altitudeAt(1)).toBe(0);
    expect(altitudeAt(0.5)).toBe(CRUISE_ALTITUDE);
    expect(altitudeAt(0.09)).toBeGreaterThan(0);
    expect(altitudeAt(0.09)).toBeLessThan(CRUISE_ALTITUDE);
  });
});
