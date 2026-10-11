"use client";

import { useEffect, useRef } from "react";

import { formatClock } from "@/lib/day/sun";
import { readScroll, subscribeScroll } from "@/lib/scroll/scroll-state";

import styles from "./ZuluClock.module.css";

/**
 * The page's clock (STORYBOARD §1). It moves only with the scroll; the text
 * is written straight into the node on every change, never through state.
 */
export function ZuluClock() {
  const node = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const write = (clock: number) => {
      if (node.current !== null)
        node.current.textContent = `${formatClock(clock)}Z`;
    };
    write(readScroll().score.clock);
    return subscribeScroll((s) => write(s.score.clock));
  }, []);

  return <span ref={node} className={`${styles.clock} tabular`} />;
}
