"use client";

import { COPY } from "@/content/copy";
import { dayAirports, legMinutes, type Day } from "@/lib/day/day";
import { formatClock } from "@/lib/day/sun";
import type { OooiEvent } from "@/lib/timeline/beats";

import { registerLabel } from "./labels";
import styles from "./SceneLabels.module.css";

export const OOOI_EVENTS: readonly OooiEvent[] = [
  "offBlock",
  "takeOff",
  "landing",
  "onBlocks",
];

/**
 * The DOM half of the globe's labels: airport codes, and the four OOOI
 * labels that stay on the arc once their ring has filled (STORYBOARD beat
 * 04). Positioned by the scene through `labels.ts`; decorative, so hidden
 * from assistive technology like the canvas itself.
 */
export function SceneLabels({ day }: { readonly day: Day }) {
  const leg1 = day.legs[0];
  const times = leg1 === undefined ? null : legMinutes(leg1);

  return (
    <div className={styles.layer} aria-hidden="true">
      {dayAirports(day).map((a) => (
        <span
          key={a.code}
          ref={(el) => registerLabel(`airport:${a.code}`, el)}
          className={`${styles.code} tabular`}
          data-visible="false"
        >
          {a.code}
        </span>
      ))}
      {times !== null
        ? OOOI_EVENTS.map((event, i) => (
            <span
              key={event}
              ref={(el) => registerLabel(`oooi:${event}`, el)}
              className={`${styles.label} tabular`}
              data-visible="false"
              data-slot={i}
            >
              <span className={styles.labelEvent}>
                {COPY.oooi.events[event]}
              </span>
              <span className={styles.labelTime}>
                {formatClock(times[event])}Z
              </span>
            </span>
          ))
        : null}
    </div>
  );
}
