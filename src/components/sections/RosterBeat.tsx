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

/** Beat 01: the roster, then the FDP extension request sheet. */
export function RosterBeat() {
  const stage = useRef<HTMLDivElement>(null);
  const onScore = useCallback((s: ScoreState) => {
    stage.current?.setAttribute(
      "data-state",
      s.progress > 0.6 ? "second" : "first",
    );
  }, []);
  useScore("roster", onScore);

  return (
    <Beat id="roster">
      <BeatLayout
        stageRef={stage}
        stageClassName={panels.stack}
        copy={
          <CopyCard
            eyebrow={COPY.roster.eyebrow}
            headline={COPY.roster.headline}
            lead={COPY.roster.lead}
          />
        }
      >
        <CapturePanel
          id="roster"
          label={COPY.roster.panel}
          alt={COPY.roster.panelAlt}
          className={panels.swapOut}
        />
        <CapturePanel
          id="roster-fdp"
          label={COPY.roster.fdpPanel}
          alt={COPY.roster.fdpAlt}
          className={panels.swapIn}
        />
      </BeatLayout>
    </Beat>
  );
}
