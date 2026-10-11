"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { readScroll, subscribeScroll } from "@/lib/scroll/scroll-state";
import { BEAT_IDS, type BeatId } from "@/lib/timeline/beats";

import styles from "./Stage.module.css";

/**
 * The fixed stage over the scene: every beat's words and instruments, one
 * block per beat, cross-faded by the scroll (STORYBOARD §5). A block rises
 * in over a beat's first tenth and fades out over its last sixth — one
 * thing at a time, never two blocks at once — and the stage itself steps
 * aside once the reader reaches the demo.
 *
 * Imperative: the opacity and the rise are written straight to the blocks
 * on every scroll update, never through state.
 */

const FADE_IN = 0.1;
const FADE_OUT = 0.16;

function presence(id: BeatId, active: BeatId, progress: number): number {
  if (id !== active) return 0;
  const first = id === BEAT_IDS[0];
  const fadeIn = first ? 1 : Math.min(1, progress / FADE_IN);
  const fadeOut = Math.min(1, (1 - progress) / FADE_OUT);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

export function Stage({ children }: { readonly children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (el === null) return undefined;
    const blocks = new Map<BeatId, HTMLElement>();
    el.querySelectorAll<HTMLElement>("[data-block]").forEach((block) => {
      blocks.set(block.dataset.block as BeatId, block);
    });

    const apply = () => {
      const { beat, progress } = readScroll();
      el.dataset.off = beat === "demo" ? "true" : "false";
      for (const [id, block] of blocks) {
        const t = presence(id, beat, progress);
        const shown = t > 0.001;
        block.style.opacity = t.toFixed(3);
        block.style.setProperty("--t", t.toFixed(3));
        if (block.dataset.active !== String(shown)) {
          block.dataset.active = String(shown);
        }
      }
    };
    apply();
    return subscribeScroll(apply);
  }, []);

  return (
    <div ref={root} id="content" className={styles.stage} data-off="false">
      {children}
    </div>
  );
}

/** One beat's block on the stage. */
export function StageBlock({
  id,
  wide = false,
  className,
  children,
}: {
  readonly id: BeatId;
  /** Spans the stage rather than the left column (the proof strip). */
  readonly wide?: boolean;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <section
      data-block={id}
      data-active="false"
      className={[styles.block, wide ? styles.wide : "", className ?? ""].join(
        " ",
      )}
      aria-labelledby={`${id}-headline`}
    >
      <div className={styles.inner}>{children}</div>
    </section>
  );
}
