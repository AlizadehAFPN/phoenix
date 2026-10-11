"use client";

import { useCallback, useRef } from "react";

import { useScore } from "@/components/scroll/useScore";
import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";

import hud from "../Hud.module.css";

/**
 * Beat 02: the leg's documents arrive on the device one after another;
 * then the signal goes, and they are still there.
 */
export function FolderBlock() {
  const list = useRef<HTMLOListElement>(null);
  const foot = useRef<HTMLParagraphElement>(null);

  const onScore = useCallback((s: ScoreState) => {
    list.current?.querySelectorAll("li").forEach((row, i) => {
      row.dataset.arrive = s.progress >= 0.18 + i * 0.1 ? "true" : "false";
    });
    if (foot.current !== null) {
      foot.current.dataset.arrive = s.progress >= 0.66 ? "true" : "false";
    }
  }, []);
  useScore("folder", onScore);

  return (
    <StageBlock id="folder">
      <Words
        id="folder"
        eyebrow={COPY.folder.eyebrow}
        headline={COPY.folder.headline}
        lead={COPY.folder.lead}
      />
      <ol ref={list} className={hud.list}>
        {COPY.folder.documents.map((doc, i) => (
          <li
            key={doc}
            className={hud.row}
            data-state="done"
            data-arrive="false"
          >
            <span className={`${hud.index} tabular`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={hud.label}>{doc}</span>
            <span className={hud.status}>{COPY.folder.cached}</span>
          </li>
        ))}
      </ol>
      <p ref={foot} className={`${hud.foot} ${hud.row}`} data-arrive="false">
        <span className={hud.label}>{COPY.folder.offline}</span>
      </p>
    </StageBlock>
  );
}
