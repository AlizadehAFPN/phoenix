/**
 * The page's score: the beats, how much scroll each one takes, what the
 * clock does inside each, and where the camera is (STORYBOARD §4).
 *
 * PURE DATA, no imports from the scene or the DOM, so it can be unit-tested
 * and so the DOM, the clock, the duty bar and the 3D scene all read one
 * description of the page rather than four that drift apart.
 *
 * NOTHING PINS. The document is a scroll track of one section per beat,
 * `lengthVh` tall, and everything the reader sees — the scene, the words,
 * the instruments — is drawn on a fixed stage from the scroll position.
 * Every tick of the wheel moves something, which is what keeps the page
 * from ever feeling stuck.
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
  /** The clock holds; the beat's own content plays on the stage. */
  | "hold"
  /** The clock holds while a hold-to-confirm ring fills around the head. */
  | "ring"
  /** The clock runs and the aircraft moves. */
  | "flight"
  /** The six sector steps unlock in order. */
  | "steps"
  /** Queued marks fill in, oldest to newest. */
  | "replay"
  /** The instruments wipe clean for the next crew member. */
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
   * width and height. The words sit on the left (STORYBOARD §5), so the
   * globe's point of interest goes right of centre; phones override this.
   */
  readonly anchor: readonly [number, number];
}

export interface Beat {
  readonly id: BeatId;
  /**
   * The beat's share of the scroll track, in viewport heights. 0 for the
   * demo, which is an ordinary section after the track.
   */
  readonly lengthVh: number;
  readonly segments: readonly Segment[];
  /** The camera at the beat's start. */
  readonly view: CameraView;
  /**
   * The camera at the beat's end, when the beat itself travels (the hero's
   * pull-back). Otherwise the view holds for the whole beat.
   */
  readonly viewEnd?: CameraView;
}

/* Route geography the views are framed around: Istanbul, Cairo, Amman. */
const ORBIT_CENTRE: GeoPoint = { lat: 35, lon: 32 };
const RIGHT: readonly [number, number] = [0.68, 0.46];
const WIDE: readonly [number, number] = [0.62, 0.5];

export const BEATS: readonly Beat[] = [
  {
    id: "hero",
    lengthVh: 120,
    segments: [{ until: 1, clock: ["02:10", "02:10"], kind: "hold" }],
    /* Low over the Balkans in the dark, looking east-southeast at the dawn
       line, which at 02:10Z lies about 26° east of Istanbul; the scroll
       pulls the camera back and up toward orbit. */
    view: {
      eye: { lat: 42.5, lon: 19, alt: 0.16 },
      look: { lat: 38.5, lon: 40, alt: 0 },
      anchor: RIGHT,
    },
    viewEnd: {
      eye: { lat: 40, lon: 23, alt: 0.7 },
      look: { lat: 36.5, lon: 36, alt: 0 },
      anchor: RIGHT,
    },
  },
  {
    id: "roster",
    lengthVh: 130,
    segments: [
      { until: 0.15, clock: ["02:10", "02:40"], kind: "intro" },
      { until: 1, clock: ["02:40", "02:40"], kind: "hold" },
    ],
    view: {
      eye: { ...ORBIT_CENTRE, alt: 1.7 },
      look: { ...ORBIT_CENTRE, alt: 0 },
      anchor: [0.66, 0.5],
    },
  },
  {
    id: "folder",
    lengthVh: 100,
    segments: [
      { until: 0.15, clock: ["02:40", "03:05"], kind: "intro" },
      { until: 1, clock: ["03:05", "03:05"], kind: "hold" },
    ],
    view: {
      eye: { lat: 41.6, lon: 27.4, alt: 0.4 },
      look: { lat: 41.26, lon: 28.73, alt: 0 },
      anchor: RIGHT,
    },
  },
  {
    id: "sector",
    lengthVh: 140,
    segments: [
      { until: 0.12, clock: ["03:05", "03:25"], kind: "intro" },
      { until: 1, clock: ["03:25", "03:25"], kind: "steps" },
    ],
    view: {
      eye: { lat: 39, lon: 27, alt: 0.75 },
      look: { lat: 35.5, lon: 30, alt: 0 },
      anchor: RIGHT,
    },
  },
  {
    id: "oooi",
    lengthVh: 220,
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
      anchor: [0.66, 0.44],
    },
  },
  {
    id: "journey",
    lengthVh: 100,
    segments: [
      { until: 0.15, clock: ["05:58", "06:15"], kind: "intro" },
      { until: 1, clock: ["06:15", "06:15"], kind: "hold" },
    ],
    view: {
      eye: { lat: 30.9, lon: 30.3, alt: 0.35 },
      look: { lat: 30.12, lon: 31.4, alt: 0 },
      anchor: RIGHT,
    },
  },
  {
    id: "signal",
    lengthVh: 170,
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
      anchor: [0.66, 0.44],
    },
  },
  {
    id: "handover",
    lengthVh: 120,
    segments: [
      { until: 0.45, clock: ["08:32", "11:58"], kind: "flight" },
      { until: 1, clock: ["11:58", "12:30"], kind: "wipe" },
    ],
    view: {
      eye: { lat: 36, lon: 30, alt: 1.4 },
      look: { lat: 35.5, lon: 31.5, alt: 0 },
      anchor: WIDE,
    },
  },
  {
    id: "proof",
    lengthVh: 90,
    segments: [{ until: 1, clock: ["12:30", "12:30"], kind: "hold" }],
    view: {
      eye: { lat: 36, lon: 30, alt: 1.4 },
      look: { lat: 35.5, lon: 31.5, alt: 0 },
      anchor: WIDE,
    },
  },
  {
    id: "regulatory",
    /* The last track: its beat runs while its bottom travels from the top
       of the screen to the bottom (see BeatTrack), so 100vh of it is the
       approach of the demo section and 70vh is the beat itself. */
    lengthVh: 170,
    segments: [{ until: 1, clock: ["12:30", "12:30"], kind: "hold" }],
    view: {
      eye: { lat: 36, lon: 30, alt: 1.4 },
      look: { lat: 35.5, lon: 31.5, alt: 0 },
      anchor: WIDE,
    },
  },
  {
    id: "demo",
    lengthVh: 0,
    segments: [{ until: 1, clock: ["12:30", "12:30"], kind: "hold" }],
    view: {
      eye: { lat: 24, lon: 36, alt: 2.4 },
      look: { lat: 18, lon: 36, alt: 0 },
      anchor: [0.3, 0.5],
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

/** The beats that live on the scroll track, in order. */
export const TRACK_BEATS: readonly Beat[] = BEATS.filter((b) => b.lengthVh > 0);
