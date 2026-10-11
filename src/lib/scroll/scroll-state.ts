/**
 * Where the reader is on the page, as the one mutable value the chrome and
 * the scene read from.
 *
 * NOT REACT STATE. The clock, the duty bar and the globe all update on every
 * scroll frame; routing that through `setState` would re-render the tree
 * sixty times a second for values that are written straight into a DOM node
 * or a uniform. So this is a plain object with a subscription, written by the
 * beats' ScrollTriggers and read inside `useFrame` and in DOM callbacks.
 */

import { BEAT_IDS, type BeatId } from "@/lib/timeline/beats";
import { scoreAt, type ScoreState } from "@/lib/timeline/score";

export interface ScrollSnapshot {
  readonly beat: BeatId;
  /** 0..1 through the beat. */
  readonly progress: number;
  /** 0..1 through the page's beats as a whole, for the duty bar. */
  readonly page: number;
  readonly score: ScoreState;
}

type Listener = (snapshot: ScrollSnapshot) => void;

let current: ScrollSnapshot = {
  beat: "hero",
  progress: 0,
  page: 0,
  score: scoreAt("hero", 0),
};

const listeners = new Set<Listener>();

export function readScroll(): ScrollSnapshot {
  return current;
}

/**
 * Written by the active beat's ScrollTrigger. `page` is derived from the
 * beat's index, so the duty bar advances evenly per beat rather than per
 * pixel, which is what keeps it readable as a count of the day's stages.
 */
export function writeScroll(beat: BeatId, progress: number): void {
  const index = BEAT_IDS.indexOf(beat);
  const page = (index + Math.min(1, Math.max(0, progress))) / BEAT_IDS.length;
  if (current.beat === beat && current.progress === progress) return;
  current = { beat, progress, page, score: scoreAt(beat, progress) };
  for (const listener of listeners) listener(current);
}

export function subscribeScroll(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
