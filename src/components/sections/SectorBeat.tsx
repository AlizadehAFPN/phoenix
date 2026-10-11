"use client";

import { useCallback, useRef } from "react";

import { Beat } from "@/components/scroll/Beat";
import { useScore } from "@/components/scroll/useScore";
import { CapturePanel } from "@/components/ui/CapturePanel";
import { CopyCard } from "@/components/ui/CopyCard";
import type { CaptureId } from "@/components/captures/manifest";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";

import { BeatLayout } from "./BeatLayout";
import panels from "./panels.module.css";
import styles from "./SectorBeat.module.css";

const STEP_CAPTURES: readonly CaptureId[] = [
  "sector-overview",
  "sector-folder",
  "sector-dispatch",
  "sector-departure",
  "sector-arrival",
  "sector-summary",
];

/**
 * Beat 03: the six steps, unlocked in order. The stepper is real DOM, so the
 * order is readable as well as visible; the panel for the current step is
 * the sharp one. Each step's state is written by hand because the list sits
 * in the copy card and the panels in the stage.
 */
export function SectorBeat() {
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const onScore = useCallback((s: ScoreState) => {
    const step = s.kind === "steps" ? s.step : 0;
    stage.current?.setAttribute("data-step", String(step));
    list.current?.querySelectorAll("li").forEach((li, i) => {
      li.setAttribute(
        "data-state",
        i < step ? "done" : i === step ? "current" : "locked",
      );
    });
  }, []);
  useScore("sector", onScore);

  return (
    <Beat id="sector">
      <BeatLayout
        stageRef={stage}
        stageClassName={styles.stage}
        copy={
          <CopyCard
            eyebrow={COPY.sector.eyebrow}
            headline={COPY.sector.headline}
            lead={COPY.sector.lead}
          >
            <ol ref={list} className={styles.steps}>
              {COPY.sector.steps.map((step, i) => (
                <li
                  key={step}
                  className={`${styles.step} tabular`}
                  data-state={i === 0 ? "current" : "locked"}
                >
                  <span className={styles.stepNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CopyCard>
        }
      >
        <div className={panels.stack}>
          {STEP_CAPTURES.map((id, i) => (
            <CapturePanel
              key={id}
              id={id}
              label={COPY.sector.steps[i] ?? ""}
              alt={COPY.sector.panelAlt(COPY.sector.steps[i] ?? "")}
              className={styles.panel}
            />
          ))}
        </div>
      </BeatLayout>
    </Beat>
  );
}
