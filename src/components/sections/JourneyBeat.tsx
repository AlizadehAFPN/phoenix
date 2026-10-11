"use client";

import { useCallback, useRef } from "react";

import { Beat } from "@/components/scroll/Beat";
import { useScore } from "@/components/scroll/useScore";
import { CapturePanel } from "@/components/ui/CapturePanel";
import { CopyCard } from "@/components/ui/CopyCard";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";

import { BeatLayout } from "./BeatLayout";
import panels from "./panels.module.css";

/** Beat 05: the photo signature, then the log locked under its number. */
export function JourneyBeat() {
  const stage = useRef<HTMLDivElement>(null);
  const onScore = useCallback((s: ScoreState) => {
    stage.current?.setAttribute(
      "data-state",
      s.progress > 0.6 ? "second" : "first",
    );
  }, []);
  useScore("journey", onScore);

  return (
    <Beat id="journey">
      <BeatLayout
        stageRef={stage}
        stageClassName={panels.stack}
        copy={
          <CopyCard
            eyebrow={COPY.journey.eyebrow}
            headline={COPY.journey.headline}
            lead={COPY.journey.lead}
          />
        }
      >
        <CapturePanel
          id="journey-signature"
          label={COPY.journey.signaturePanel}
          alt={COPY.journey.signatureAlt}
          className={panels.swapOut}
        />
        <CapturePanel
          id="journey-locked"
          label={COPY.journey.panel}
          alt={COPY.journey.panelAlt}
          className={panels.swapIn}
        />
      </BeatLayout>
    </Beat>
  );
}
