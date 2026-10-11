"use client";

import { useCallback, useRef } from "react";

import { Beat } from "@/components/scroll/Beat";
import { useScore } from "@/components/scroll/useScore";
import { CapturePanel } from "@/components/ui/CapturePanel";
import { CopyCard } from "@/components/ui/CopyCard";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";

import { BeatLayout } from "./BeatLayout";
import styles from "./HandoverBeat.module.css";
import panels from "./panels.module.css";

/**
 * Beat 07: sign-out. One wipe takes the crew member's screen to clean glass;
 * the next crew member's roster appears on it.
 */
export function HandoverBeat() {
  const stage = useRef<HTMLDivElement>(null);
  const onScore = useCallback((s: ScoreState) => {
    const el = stage.current;
    if (el === null) return;
    el.style.setProperty("--wipe", String(s.wipe));
    el.setAttribute("data-state", s.wipe > 0.85 ? "second" : "first");
  }, []);
  useScore("handover", onScore);

  return (
    <Beat id="handover">
      <BeatLayout
        stageRef={stage}
        stageClassName={`${panels.stack} ${styles.stage}`}
        copy={
          <CopyCard
            eyebrow={COPY.handover.eyebrow}
            headline={COPY.handover.headline}
            lead={COPY.handover.lead}
          />
        }
      >
        {/* The glass the screen wipes down to: the panel's own surface,
            with nothing on it. */}
        <div
          className={`${panels.turned} ${styles.glass}`}
          aria-hidden="true"
        />
        <CapturePanel
          id="handover-sign-out"
          label={COPY.handover.panel}
          alt={COPY.handover.panelAlt}
          className={`${panels.turned} ${styles.wiped}`}
        />
        <CapturePanel
          id="handover-next"
          label={COPY.handover.next}
          alt={COPY.handover.next}
          className={panels.swapIn}
        />
      </BeatLayout>
    </Beat>
  );
}
