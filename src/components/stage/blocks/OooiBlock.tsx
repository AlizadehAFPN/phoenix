"use client";

import { useCallback, useRef } from "react";

import { useScore } from "@/components/scroll/useScore";
import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";
import type { OooiEvent } from "@/lib/timeline/beats";
import type { ScoreState } from "@/lib/timeline/score";
import { THEME } from "@/theme";

import hud from "../Hud.module.css";

const EVENTS: readonly OooiEvent[] = [
  "offBlock",
  "takeOff",
  "landing",
  "onBlocks",
];

/** "8 650" — a thin space between the thousands, as the app sets figures. */
function kg(value: number): string {
  return value.toLocaleString("en-GB").replace(/,/g, " ");
}

/**
 * Beat 04: the four OOOI events, each with its time and fuel reading. The
 * ring in the current row fills with the hold on the globe; a row is done
 * once its clock has passed.
 */
export function OooiBlock() {
  const list = useRef<HTMLOListElement>(null);
  const foot = useRef<HTMLParagraphElement>(null);
  const leg = THEME.day.legs[0];

  const onScore = useCallback((s: ScoreState) => {
    let current = 0;
    if (s.ring !== null) current = EVENTS.indexOf(s.ring.event);
    else if (s.progress > 0.9) current = 3;
    else if (s.progress > 0.74) current = 2;
    else if (s.progress > 0.21) current = 1;
    const fill = s.ring?.fill ?? 1;
    const submitted = s.ring?.event === "onBlocks" && s.ring.fill >= 0.98;

    list.current?.querySelectorAll("li").forEach((row, i) => {
      row.dataset.state =
        i < current ? "done" : i === current ? "current" : "pending";
      row.style.setProperty(
        "--fill",
        i < current ? "1" : i === current ? String(fill) : "0",
      );
    });
    if (foot.current !== null) {
      foot.current.dataset.arrive = submitted ? "true" : "false";
    }
  }, []);
  useScore("oooi", onScore);

  if (leg === undefined) return null;

  return (
    <StageBlock id="oooi">
      <Words
        id="oooi"
        eyebrow={COPY.oooi.eyebrow}
        headline={COPY.oooi.headline}
        lead={COPY.oooi.lead}
      />
      <ol ref={list} className={`${hud.list} tabular`}>
        {EVENTS.map((event, i) => (
          <li
            key={event}
            className={hud.row}
            data-state={i === 0 ? "current" : "pending"}
            data-arrive="true"
          >
            <span className={hud.ring} aria-hidden="true" />
            <span className={hud.label}>{COPY.oooi.events[event]}</span>
            <span className={hud.value}>
              {leg[event]}Z<span className={hud.unit}>·</span>
              {kg(leg.fuelKg[event])}
              <span className={hud.unit}>{COPY.oooi.fuelUnit}</span>
            </span>
          </li>
        ))}
      </ol>
      <p ref={foot} className={`${hud.foot} ${hud.row}`} data-arrive="false">
        <span className={hud.label}>{COPY.oooi.submitted}</span>
      </p>
    </StageBlock>
  );
}
