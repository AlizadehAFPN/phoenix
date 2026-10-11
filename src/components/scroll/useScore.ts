"use client";

import { useEffect, useRef } from "react";

import {
  readScroll,
  subscribeScroll,
  type ScrollSnapshot,
} from "@/lib/scroll/scroll-state";
import { BEAT_IDS, type BeatId } from "@/lib/timeline/beats";
import { scoreAt, type ScoreState } from "@/lib/timeline/score";

/**
 * Calls `onScore` with the score whenever the reader moves inside the beat,
 * and once more with the beat's final state when they leave it going down
 * (or its initial state going up), so a panel never freezes half way through
 * a transition the reader scrolled past quickly.
 *
 * Imperative on purpose: the callback writes data attributes or style
 * properties, and the component does not re-render.
 */
export function useScore(
  id: BeatId,
  onScore: (score: ScoreState) => void,
): void {
  const callback = useRef(onScore);
  useEffect(() => {
    callback.current = onScore;
  }, [onScore]);

  useEffect(() => {
    let wasInside = false;
    const handle = (snapshot: ScrollSnapshot) => {
      if (snapshot.beat === id) {
        wasInside = true;
        callback.current(snapshot.score);
        return;
      }
      const after = BEAT_IDS.indexOf(snapshot.beat) > BEAT_IDS.indexOf(id);
      if (wasInside) {
        wasInside = false;
        callback.current(scoreAt(id, after ? 1 : 0));
      } else if (after) {
        /* Mounted while the reader is already past this beat: show its end. */
        callback.current(scoreAt(id, 1));
      }
    };
    handle(readScroll());
    return subscribeScroll(handle);
  }, [id]);
}
