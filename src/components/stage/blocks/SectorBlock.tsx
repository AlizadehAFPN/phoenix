"use client";

import { useCallback, useRef } from "react";

import { useScore } from "@/components/scroll/useScore";
import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";

import hud from "../Hud.module.css";

/** Beat 03: the six steps, unlocked in order. */
export function SectorBlock() {
  const list = useRef<HTMLOListElement>(null);

  const onScore = useCallback((s: ScoreState) => {
    const step = s.kind === "steps" ? s.step : 0;
    list.current?.querySelectorAll("li").forEach((row, i) => {
      const state = i < step ? "done" : i === step ? "current" : "locked";
      row.dataset.state = state;
      const status = row.querySelector("[data-status]");
      if (status !== null) {
        status.textContent =
          state === "done"
            ? COPY.sector.done
            : state === "current"
              ? COPY.sector.current
              : COPY.sector.locked;
      }
    });
  }, []);
  useScore("sector", onScore);

  return (
    <StageBlock id="sector">
      <Words
        id="sector"
        eyebrow={COPY.sector.eyebrow}
        headline={COPY.sector.headline}
        lead={COPY.sector.lead}
      />
      <ol ref={list} className={hud.list}>
        {COPY.sector.steps.map((step, i) => (
          <li
            key={step}
            className={hud.row}
            data-state={i === 0 ? "current" : "locked"}
            data-arrive="true"
          >
            <span className={`${hud.index} tabular`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={hud.label}>{step}</span>
            <span className={hud.status} data-status>
              {i === 0 ? COPY.sector.current : COPY.sector.locked}
            </span>
          </li>
        ))}
      </ol>
    </StageBlock>
  );
}
