"use client";

import { useCallback, useRef } from "react";

import { useScore } from "@/components/scroll/useScore";
import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";
import { THEME } from "@/theme";

import hud from "../Hud.module.css";

/**
 * Beat 05: the signature, the face check, then the log locked under its
 * number — three rows that complete one after another through the hold.
 */
export function JourneyBlock() {
  const list = useRef<HTMLOListElement>(null);
  const leg = THEME.day.legs[0];
  const date = THEME.day.date;

  const onScore = useCallback((s: ScoreState) => {
    const thresholds = [0.32, 0.5, 0.68];
    list.current?.querySelectorAll("li").forEach((row, i) => {
      const limit = thresholds[i] ?? 1;
      const previous = thresholds[i - 1] ?? 0;
      row.dataset.state =
        s.progress >= limit
          ? "done"
          : s.progress >= previous
            ? "current"
            : "pending";
    });
  }, []);
  useScore("journey", onScore);

  if (leg === undefined) return null;

  return (
    <StageBlock id="journey">
      <Words
        id="journey"
        eyebrow={COPY.journey.eyebrow}
        headline={COPY.journey.headline}
        lead={COPY.journey.lead}
      />
      <ol ref={list} className={hud.list}>
        <li className={hud.row} data-state="pending" data-arrive="true">
          <span className={`${hud.index} tabular`}>01</span>
          <span className={hud.label}>{COPY.journey.signature}</span>
          <span className={hud.status} />
        </li>
        <li className={hud.row} data-state="pending" data-arrive="true">
          <span className={`${hud.index} tabular`}>02</span>
          <span className={hud.label}>{COPY.journey.faceCheck}</span>
          <span className={hud.status} />
        </li>
        <li className={hud.row} data-state="pending" data-arrive="true">
          <span className={`${hud.index} tabular`}>03</span>
          <span className={`${hud.label} tabular`}>
            {COPY.journey.log} · {leg.from}–{leg.to} · {date}
          </span>
          <span className={hud.status} data-lock>
            {COPY.journey.locked}
          </span>
        </li>
      </ol>
    </StageBlock>
  );
}
