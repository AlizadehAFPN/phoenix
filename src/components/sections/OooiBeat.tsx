"use client";

import { useCallback, useRef } from "react";

import { Beat } from "@/components/scroll/Beat";
import { useScore } from "@/components/scroll/useScore";
import { CapturePanel } from "@/components/ui/CapturePanel";
import { CopyCard } from "@/components/ui/CopyCard";
import type { CaptureId } from "@/components/captures/manifest";
import { COPY } from "@/content/copy";
import type { OooiEvent } from "@/lib/timeline/beats";
import type { ScoreState } from "@/lib/timeline/score";

import { BeatLayout } from "./BeatLayout";
import styles from "./OooiBeat.module.css";
import panels from "./panels.module.css";

const EVENTS: readonly {
  readonly event: OooiEvent;
  readonly capture: CaptureId;
}[] = [
  { event: "offBlock", capture: "oooi-off-block" },
  { event: "takeOff", capture: "oooi-take-off" },
  { event: "landing", capture: "oooi-landing" },
  { event: "onBlocks", capture: "oooi-on-blocks" },
];

/**
 * Beat 04: the four OOOI events. The stage shows the capture for the event
 * whose ring is filling (or the last one filled), and the post-flight
 * submission once the last ring is full. The rings themselves are on the
 * globe, around the head of the line; the small rings in the copy card are
 * their echo.
 */
export function OooiBeat() {
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const onScore = useCallback((s: ScoreState) => {
    const el = stage.current;
    if (el === null) return;

    let current = 0;
    EVENTS.forEach(({ event }, i) => {
      if (s.ring?.event === event) current = i;
    });
    if (s.ring === null) {
      /* Between rings: the flight segments. The last ring filled is the one
         whose clock has passed. */
      if (s.progress > 0.9) current = 3;
      else if (s.progress > 0.74) current = 2;
      else if (s.progress > 0.21) current = 1;
      else current = 0;
    }
    const fill = s.ring?.fill ?? 1;
    const submitted = s.ring?.event === "onBlocks" && s.ring.fill >= 0.98;

    el.setAttribute(
      "data-event",
      submitted ? "submit" : (EVENTS[current]?.event ?? "offBlock"),
    );
    list.current?.querySelectorAll("li").forEach((li, i) => {
      li.setAttribute(
        "data-state",
        i < current ? "done" : i === current ? "current" : "pending",
      );
      li.style.setProperty(
        "--fill",
        i < current ? "1" : i === current ? String(fill) : "0",
      );
    });
  }, []);
  useScore("oooi", onScore);

  return (
    <Beat id="oooi">
      <BeatLayout
        stageRef={stage}
        stageClassName={styles.stage}
        copy={
          <CopyCard
            eyebrow={COPY.oooi.eyebrow}
            headline={COPY.oooi.headline}
            lead={COPY.oooi.lead}
          >
            <ol ref={list} className={styles.events}>
              {EVENTS.map(({ event }, i) => (
                <li
                  key={event}
                  className={styles.event}
                  data-state={i === 0 ? "current" : "pending"}
                >
                  <span className={styles.ring} aria-hidden="true" />
                  <span>{COPY.oooi.events[event]}</span>
                </li>
              ))}
            </ol>
          </CopyCard>
        }
      >
        <div className={panels.stack}>
          {EVENTS.map(({ event, capture }) => (
            <CapturePanel
              key={event}
              id={capture}
              label={COPY.oooi.events[event]}
              alt={COPY.oooi.panelAlt(COPY.oooi.events[event])}
              className={styles.panel}
            />
          ))}
          <CapturePanel
            id="oooi-submit"
            label={COPY.oooi.submit}
            alt={COPY.oooi.submitAlt}
            className={styles.panel}
          />
        </div>
      </BeatLayout>
    </Beat>
  );
}
