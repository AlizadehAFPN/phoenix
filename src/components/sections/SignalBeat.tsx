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

/** Beat 06: the Sync Status card, queued during the flight, sent after it. */
export function SignalBeat() {
  const stage = useRef<HTMLDivElement>(null);
  const onScore = useCallback((s: ScoreState) => {
    stage.current?.setAttribute(
      "data-state",
      s.replay > 0.6 ? "second" : "first",
    );
  }, []);
  useScore("signal", onScore);

  return (
    <Beat id="signal">
      <BeatLayout
        stageRef={stage}
        stageClassName={panels.stack}
        copy={
          <CopyCard
            eyebrow={COPY.signal.eyebrow}
            headline={COPY.signal.headline}
            lead={COPY.signal.lead}
          />
        }
      >
        <CapturePanel
          id="signal-queued"
          label={COPY.signal.queuedPanel}
          alt={COPY.signal.queuedAlt}
          className={panels.swapOut}
        />
        <CapturePanel
          id="signal-sent"
          label={COPY.signal.sentPanel}
          alt={COPY.signal.sentAlt}
          className={panels.swapIn}
        />
      </BeatLayout>
    </Beat>
  );
}
