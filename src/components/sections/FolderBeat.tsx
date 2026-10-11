"use client";

import { useCallback, useRef } from "react";

import { Beat } from "@/components/scroll/Beat";
import { useScore } from "@/components/scroll/useScore";
import { CapturePanel } from "@/components/ui/CapturePanel";
import { CopyCard } from "@/components/ui/CopyCard";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";

import { BeatLayout } from "./BeatLayout";
import styles from "./FolderBeat.module.css";
import panels from "./panels.module.css";

/**
 * Beat 02: the documents arrive and settle into the folder; then the signal
 * goes and one of them opens anyway.
 */
export function FolderBeat() {
  const stage = useRef<HTMLDivElement>(null);
  const onScore = useCallback((s: ScoreState) => {
    const el = stage.current;
    if (el === null) return;
    /* The pages arrive across the first half of the hold, one after another. */
    const arrival = Math.min(1, Math.max(0, (s.progress - 0.15) / 0.4));
    el.style.setProperty("--arrival", String(arrival));
    el.setAttribute("data-state", s.progress > 0.72 ? "second" : "first");
    el.setAttribute("data-offline", s.progress > 0.62 ? "true" : "false");
  }, []);
  useScore("folder", onScore);

  return (
    <Beat id="folder">
      <BeatLayout
        stageRef={stage}
        stageClassName={`${panels.stack} ${styles.stage}`}
        copy={
          <CopyCard
            eyebrow={COPY.folder.eyebrow}
            headline={COPY.folder.headline}
            lead={COPY.folder.lead}
          />
        }
      >
        <CapturePanel
          id="folder"
          label={COPY.folder.panel}
          alt={COPY.folder.panelAlt}
          className={panels.swapOut}
        />
        <CapturePanel
          id="folder-viewer"
          label={COPY.folder.viewerPanel}
          alt={COPY.folder.viewerAlt}
          className={panels.swapIn}
        />
        <ul className={styles.pages} aria-hidden="true">
          {COPY.folder.pages.map((page, i) => (
            <li
              key={page}
              className={styles.page}
              style={{ "--i": i } as React.CSSProperties}
            >
              {page}
            </li>
          ))}
        </ul>
        <span className={styles.signal} aria-hidden="true" />
      </BeatLayout>
    </Beat>
  );
}
