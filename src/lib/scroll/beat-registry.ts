/**
 * Which beat the reader is in, as a function of the scroll position.
 *
 * Each beat's ScrollTrigger registers its scroll range here. One global
 * trigger (in `ScrollProvider`) resolves the active beat on every scroll
 * update: the last beat whose range has started, with its progress clamped.
 * That makes the state DETERMINISTIC — a jump across several beats lands on
 * exactly one answer — where letting every beat's own callback write the
 * state made the result depend on the order the callbacks ran in.
 */

import { BEAT_IDS, type BeatId } from "@/lib/timeline/beats";

export interface BeatRange {
  readonly start: () => number;
  readonly end: () => number;
}

const ranges = new Map<BeatId, BeatRange>();

export function registerBeatRange(id: BeatId, range: BeatRange): () => void {
  ranges.set(id, range);
  return () => {
    if (ranges.get(id) === range) ranges.delete(id);
  };
}

/** The active beat and its progress at `scroll` pixels. */
export function resolveScroll(scroll: number): {
  readonly beat: BeatId;
  readonly progress: number;
} {
  let active: BeatId = BEAT_IDS[0];
  let progress = 0;
  for (const id of BEAT_IDS) {
    const range = ranges.get(id);
    if (range === undefined) continue;
    const start = range.start();
    if (scroll < start) break;
    const end = range.end();
    active = id;
    progress =
      end > start
        ? Math.min(1, Math.max(0, (scroll - start) / (end - start)))
        : 1;
  }
  return { beat: active, progress };
}
