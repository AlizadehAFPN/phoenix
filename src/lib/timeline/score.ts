/**
 * Reads the score at a point in the scroll: which segment, what the clock
 * says, how far a ring has filled, how far the replay has run.
 *
 * Everything the chrome and the scene need from "the reader is `progress`
 * of the way through beat `id`" comes from this one function, so the clock
 * in the header and the terminator on the globe can never disagree.
 */

import { parseClock } from "@/lib/day/sun";

import {
  beat,
  type BeatId,
  type OooiEvent,
  type Segment,
  type SegmentKind,
} from "./beats";

export interface ScoreState {
  readonly beat: BeatId;
  /** 0..1 through the beat. */
  readonly progress: number;
  readonly kind: SegmentKind;
  /** 0..1 through the current segment. */
  readonly segmentProgress: number;
  /** Minutes after midnight Zulu. */
  readonly clock: number;
  /** For a `ring` segment: the event and how far its hold has filled. */
  readonly ring: { readonly event: OooiEvent; readonly fill: number } | null;
  /** For a `replay` segment: how far the queued marks have filled, 0..1. */
  readonly replay: number;
  /** For a `wipe` segment: how far the panels have wiped, 0..1. */
  readonly wipe: number;
  /** For a `steps` segment: the current sector step, 0..5. */
  readonly step: number;
}

export const SECTOR_STEPS = 6;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function segmentAt(
  segments: readonly Segment[],
  progress: number,
): {
  readonly segment: Segment;
  readonly start: number;
} {
  let start = 0;
  for (const segment of segments) {
    if (progress <= segment.until) return { segment, start };
    start = segment.until;
  }
  const last = segments[segments.length - 1];
  if (last === undefined) throw new Error("a beat has no segments");
  return {
    segment: last,
    start:
      segments.length > 1 ? (segments[segments.length - 2]?.until ?? 0) : 0,
  };
}

export function scoreAt(id: BeatId, rawProgress: number): ScoreState {
  const progress = clamp01(rawProgress);
  const { segment, start } = segmentAt(beat(id).segments, progress);
  const span = segment.until - start;
  const segmentProgress = span <= 0 ? 1 : clamp01((progress - start) / span);

  const [from, to] = segment.clock;
  const clock =
    parseClock(from) + (parseClock(to) - parseClock(from)) * segmentProgress;

  return {
    beat: id,
    progress,
    kind: segment.kind,
    segmentProgress,
    clock,
    ring:
      segment.kind === "ring" && segment.event !== undefined
        ? { event: segment.event, fill: segmentProgress }
        : null,
    replay: segment.kind === "replay" ? segmentProgress : 0,
    wipe: segment.kind === "wipe" ? segmentProgress : 0,
    step:
      segment.kind === "steps"
        ? Math.min(SECTOR_STEPS - 1, Math.floor(segmentProgress * SECTOR_STEPS))
        : 0,
  };
}

/** The clock at the very end of a beat, minutes Zulu. */
export function clockAtEnd(id: BeatId): number {
  const segments = beat(id).segments;
  const last = segments[segments.length - 1];
  if (last === undefined) throw new Error("a beat has no segments");
  return parseClock(last.clock[1]);
}

/** The clock at the very start of a beat, minutes Zulu. */
export function clockAtStart(id: BeatId): number {
  const first = beat(id).segments[0];
  if (first === undefined) throw new Error("a beat has no segments");
  return parseClock(first.clock[0]);
}
