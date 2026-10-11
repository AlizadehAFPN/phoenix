"use client";

import { useCallback, useRef } from "react";

import { useScore } from "@/components/scroll/useScore";
import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";
import { legMinutes } from "@/lib/day/day";
import type { ScoreState } from "@/lib/timeline/score";
import { THEME } from "@/theme";

import hud from "../Hud.module.css";

/** Where along the flight each queued action happens, as the globe's marks do. */
const MARKS: readonly number[] = [0.03, 0.22, 0.48, 0.74, 0.97];

/**
 * Beat 06: the sync queue. Each action joins the queue as the flight passes
 * its mark; once coverage returns they go out in the order performed.
 */
export function SignalBlock() {
  const list = useRef<HTMLOListElement>(null);
  const leg = THEME.day.legs[1];

  const onScore = useCallback(
    (s: ScoreState) => {
      if (leg === undefined) return;
      const t = legMinutes(leg);
      const airborne = Math.min(
        1,
        Math.max(0, (s.clock - t.takeOff) / (t.landing - t.takeOff)),
      );
      list.current?.querySelectorAll("li").forEach((row, i) => {
        const reached = MARKS[i] ?? 1;
        const sent = s.replay >= (i + 1) / MARKS.length;
        row.dataset.arrive = airborne >= reached ? "true" : "false";
        row.dataset.state = sent ? "done" : "current";
        const status = row.querySelector("[data-status]");
        if (status !== null) {
          status.textContent = sent ? COPY.signal.sent : COPY.signal.queued;
        }
      });
    },
    [leg],
  );
  useScore("signal", onScore);

  return (
    <StageBlock id="signal">
      <Words
        id="signal"
        eyebrow={COPY.signal.eyebrow}
        headline={COPY.signal.headline}
        lead={COPY.signal.lead}
      />
      <ol ref={list} className={hud.list} aria-label={COPY.signal.syncStatus}>
        {COPY.signal.queue.map((item, i) => (
          <li
            key={item}
            className={hud.row}
            data-state="current"
            data-arrive="false"
          >
            <span className={`${hud.index} tabular`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={hud.label}>{item}</span>
            <span className={hud.status} data-status>
              {COPY.signal.queued}
            </span>
          </li>
        ))}
      </ol>
    </StageBlock>
  );
}
