"use client";

import { useEffect, useRef } from "react";

import { COPY } from "@/content/copy";
import { parseClock } from "@/lib/day/sun";
import { readScroll, subscribeScroll } from "@/lib/scroll/scroll-state";
import { THEME } from "@/theme";

import styles from "./DutyBar.module.css";

/**
 * The duty bar (STORYBOARD §3): the FDP window from report to the limit, a
 * thin line that fills with the clock. The quietest element on the page.
 */
export function DutyBar() {
  const fill = useRef<HTMLSpanElement>(null);
  const { report, dutyLimit } = THEME.day;

  useEffect(() => {
    const start = parseClock(report);
    const end = parseClock(dutyLimit);
    const write = (clock: number) => {
      const f = Math.min(1, Math.max(0, (clock - start) / (end - start)));
      fill.current?.style.setProperty("--fill", String(f));
    };
    write(readScroll().score.clock);
    return subscribeScroll((s) => write(s.score.clock));
  }, [report, dutyLimit]);

  return (
    <span className={styles.duty}>
      <span className={`${styles.label} tabular`}>
        {COPY.chrome.duty} {report}Z
      </span>
      <span className={styles.track}>
        <span ref={fill} className={styles.fill} />
      </span>
      <span className={`${styles.label} tabular`}>
        {COPY.chrome.limit} {dutyLimit}Z
      </span>
    </span>
  );
}
