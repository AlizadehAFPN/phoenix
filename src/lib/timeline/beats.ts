/**
 * The page's score: the beats, how long each pins, what the clock does inside
 * each, and where the camera is (STORYBOARD §4).
 *
 * PURE DATA, no imports from the scene or the DOM, so it can be unit-tested
 * and so the DOM, the clock, the duty bar and the 3D scene all read one
 * description of the page rather than four that drift apart.
 *
 * A beat is split into SEGMENTS. Each segment ends at a fraction of the
 * beat's scroll and carries the clock at its start and end, so the clock can
 * run (a flight), hold (a hold-to-confirm ring filling while the aircraft
 * stands still) or bridge the previous beat's time to this one (an intro).
 * The clock is continuous across the whole page by construction: every
 * beat's first segment starts at the previous beat's last clock.
 */

import type { GeoPoint } from "@/lib/day/geo";

export const BEAT_IDS = [
  "hero",
  "roster",
  "folder",
  "sector",
  "oooi",
  "journey",
  "signal",
  "handover",
  "proof",
  "regulatory",
  "demo",
] as const;

export type BeatId = (typeof BEAT_IDS)[number];

export type OooiEvent = "offBlock" | "takeOff" | "landing" | "onBlocks";

export type SegmentKind =
  /** The clock bridges from the previous beat; nothing else happens. */
  | "intro"
  /** The clock holds; the beat's own content plays on the DOM. */
  | "hold"
  /** The clock holds while a hold-to-confirm ring fills around the head. */
  | "ring"
  /** The clock runs and the aircraft moves. */
  | "flight"
  /** The six sector steps unlock in order. */
  | "steps"
  /** Queued marks fill in, oldest to newest. */
  | "replay"
  /** Every panel wipes to clean glass. */
  | "wipe";

export interface Segment {
  /** The fraction of the beat at which the segment ends, ascending, last = 1. */
  readonly until: number;
  /** Clock at the segment's start and end, `HH:MM` Zulu. */
  readonly clock: readonly [string, string];
  readonly kind: SegmentKind;
  /** For `ring`: the OOOI event whose hold is filling. */
  readonly event?: OooiEvent;
}

/**
 * A camera anchor in geographic terms. `alt` is height above the surface as
 * a fraction of the globe's radius. A `head` anchor follows the aircraft,
 * offset by degrees of latitude and longitude.
 */
export type Anchor =
  | (GeoPoint & { readonly alt: number })
  | {
      readonly head: true;
      readonly dLat: number;
      readonly dLon: number;
      readonly alt: number;
    };

export interface CameraView {
  readonly eye: Anchor;
  readonly look: Anchor;
  /**
   * Where the look point lands on the screen, as fractions of the viewport
   * width and height. The copy card sits top-left and the screen panel
   * bottom-right (STORYBOARD §5), so the globe's point of interest is placed
   * in the free upper-right quadrant; phones override this.
   */
  readonly anchor: readonly [number, number];
}

export interface Beat {
  readonly id: BeatId;
  /**
   * How long the beat pins on desktop, in viewport heights, beyond its own
   * height. 0 means the section scrolls through without pinning. Phones
   * never pin (STORYBOARD §5).
   */
  readonly pinVh: number;
  readonly segments: readonly Segment[];
  readonly view: CameraView;
}

/* Route geography the views are framed around: Istanbul, Cairo, Amman. */
const ORBIT_CENTRE: GeoPoint = { lat: 35, lon: 32 };

export const BEATS: readonly Beat[] = [
  {
    id: "hero",
    pinVh: 0,
    segments: [{ until: 1, clock: ["02:10", "02:10"], kind: "hold" }],
    /* Low over the Balkans, looking east-southeast at the dawn line, which at
       02:10Z lies about 26° east of Istanbul. */
    view: {
      eye: { lat: 42, lon: 17, alt: 0.3 },
      look: { lat: 37, lon: 48, alt: 0 },
      anchor: [0.72, 0.42],
    },
  },
  {
    id: "roster",
    pinVh: 200,
    segments: [
      { until: 0.15, clock: ["02:10", "02:40"], kind: "intro" },
      { until: 1, clock: ["02:40", "02:40"], kind: "hold" },
    ],
    view: {
      eye: { ...ORBIT_CENTRE, alt: 1.7 },
      look: { ...ORBIT_CENTRE, alt: 0 },
      anchor: [0.62, 0.5],
    },
  },
  {
    id: "folder",
    pinVh: 200,
    segments: [
      { until: 0.15, clock: ["02:40", "03:05"], kind: "intro" },
      { until: 1, clock: ["03:05", "03:05"], kind: "hold" },
    ],
    view: {
      eye: { lat: 41.6, lon: 27.4, alt: 0.4 },
      look: { lat: 41.26, lon: 28.73, alt: 0 },
      anchor: [0.74, 0.3],
    },
  },
  {
    id: "sector",
    pinVh: 300,
    segments: [
      { until: 0.12, clock: ["03:05", "03:25"], kind: "intro" },
      { until: 1, clock: ["03:25", "03:25"], kind: "steps" },
    ],
    view: {
      eye: { lat: 39, lon: 27, alt: 0.75 },
      look: { lat: 35.5, lon: 30, alt: 0 },
      anchor: [0.74, 0.3],
    },
  },
  {
    id: "oooi",
    pinVh: 320,
    segments: [
      { until: 0.05, clock: ["03:25", "03:40"], kind: "intro" },
      {
        until: 0.15,
        clock: ["03:40", "03:40"],
        kind: "ring",
        event: "offBlock",
      },
      { until: 0.21, clock: ["03:40", "03:55"], kind: "flight" },
      {
        until: 0.31,
        clock: ["03:55", "03:55"],
        kind: "ring",
        event: "takeOff",
      },
      { until: 0.74, clock: ["03:55", "05:50"], kind: "flight" },
      {
        until: 0.84,
        clock: ["05:50", "05:50"],
        kind: "ring",
        event: "landing",
      },
      { until: 0.9, clock: ["05:50", "05:58"], kind: "flight" },
      { until: 1, clock: ["05:58", "05:58"], kind: "ring", event: "onBlocks" },
    ],
    /* Behind and above the head. Leg 1 runs south-south-east, so "behind" is
       north and a little west. */
    view: {
      eye: { head: true, dLat: 7, dLon: -6, alt: 0.5 },
      look: { head: true, dLat: 0, dLon: 0, alt: 0.02 },
      anchor: [0.72, 0.3],
    },
  },
  {
    id: "journey",
    pinVh: 200,
    segments: [
      { until: 0.15, clock: ["05:58", "06:15"], kind: "intro" },
      { until: 1, clock: ["06:15", "06:15"], kind: "hold" },
    ],
    view: {
      eye: { lat: 30.9, lon: 30.3, alt: 0.35 },
      look: { lat: 30.12, lon: 31.4, alt: 0 },
      anchor: [0.74, 0.3],
    },
  },
  {
    id: "signal",
    pinVh: 260,
    segments: [
      { until: 0.08, clock: ["06:15", "06:55"], kind: "intro" },
      { until: 0.14, clock: ["06:55", "07:10"], kind: "flight" },
      { until: 0.7, clock: ["07:10", "08:25"], kind: "flight" },
      { until: 0.76, clock: ["08:25", "08:32"], kind: "flight" },
      { until: 1, clock: ["08:32", "08:32"], kind: "replay" },
    ],
    /* Leg 2 runs east-north-east; behind is south-west. */
    view: {
      eye: { head: true, dLat: -5, dLon: -7, alt: 0.45 },
      look: { head: true, dLat: 0, dLon: 0, alt: 0.02 },
      anchor: [0.72, 0.3],
    },
  },
  {
    id: "handover",
    pinVh: 220,
    segments: [
      { until: 0.45, clock: ["08:32", "11:58"], kind: "flight" },
      { until: 1, clock: ["11:58", "12:30"], kind: "wipe" },
    ],
    view: {
      eye: { lat: 36, lon: 30, alt: 1.4 },
      look: { lat: 35.5, lon: 31.5, alt: 0 },
      anchor: [0.6, 0.42],
    },
  },
  {
    id: "proof",
    pinVh: 0,
    segments: [{ until: 1, clock: ["12:30", "12:30"], kind: "hold" }],
    view: {
      eye: { lat: 36, lon: 30, alt: 1.4 },
      look: { lat: 35.5, lon: 31.5, alt: 0 },
      anchor: [0.6, 0.42],
    },
  },
  {
    id: "regulatory",
    pinVh: 0,
    segments: [{ until: 1, clock: ["12:30", "12:30"], kind: "hold" }],
    view: {
      eye: { lat: 36, lon: 30, alt: 1.4 },
      look: { lat: 35.5, lon: 31.5, alt: 0 },
      anchor: [0.6, 0.42],
    },
  },
  {
    id: "demo",
    pinVh: 0,
    segments: [{ until: 1, clock: ["12:30", "12:30"], kind: "hold" }],
    view: {
      eye: { lat: 24, lon: 36, alt: 2.4 },
      look: { lat: 18, lon: 36, alt: 0 },
      anchor: [0.32, 0.55],
    },
  },
];

export function beat(id: BeatId): Beat {
  const found = BEATS.find((b) => b.id === id);
  if (found === undefined) throw new Error(`unknown beat "${id}"`);
  return found;
}

export function beatIndex(id: BeatId): number {
  return BEATS.findIndex((b) => b.id === id);
}
