"use client";

import { useCallback, useRef } from "react";

import { useScore } from "@/components/scroll/useScore";
import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";
import { legMinutes } from "@/lib/day/day";
import { parseClock } from "@/lib/day/sun";
import type { ScoreState } from "@/lib/timeline/score";
import { THEME } from "@/theme";

import hud from "../Hud.module.css";

/** Minutes as "9 h 18". */
function duration(minutes: number): string {
  return `${String(Math.floor(minutes / 60))} h ${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Beat 01: the day's legs, each row arriving as its line draws on the globe
 * (the same thresholds `Route` uses), and the duty under it.
 */
export function RosterBlock() {
  const list = useRef<HTMLOListElement>(null);
  const { day } = THEME;
  const last = day.legs[day.legs.length - 1];
  const fdp =
    last === undefined ? 0 : legMinutes(last).onBlocks - parseClock(day.report);

  const onScore = useCallback((s: ScoreState) => {
    list.current?.querySelectorAll("li").forEach((row, i) => {
      row.dataset.arrive = s.progress >= 0.2 + i * 0.22 ? "true" : "false";
    });
  }, []);
  useScore("roster", onScore);

  return (
    <StageBlock id="roster">
      <Words
        id="roster"
        eyebrow={COPY.roster.eyebrow}
        headline={COPY.roster.headline}
        lead={COPY.roster.lead}
      />
      <ol ref={list} className={`${hud.list} tabular`}>
        {day.legs.map((leg, i) => (
          <li
            key={`${leg.from}-${leg.to}`}
            className={hud.row}
            data-state="done"
            data-arrive="false"
          >
            <span className={hud.index}>{String(i + 1).padStart(2, "0")}</span>
            <span className={hud.label}>
              {leg.from} → {leg.to}
            </span>
            <span className={hud.value}>
              {leg.offBlock}Z – {leg.onBlocks}Z
            </span>
          </li>
        ))}
      </ol>
      <p className={`${hud.foot} tabular`}>
        {COPY.roster.report} {day.report}Z · {COPY.roster.fdp} {duration(fdp)} ·{" "}
        {COPY.roster.limit} {day.dutyLimit}Z
      </p>
    </StageBlock>
  );
}
