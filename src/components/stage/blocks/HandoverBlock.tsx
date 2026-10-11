"use client";

import { useCallback, useRef } from "react";

import { useScore } from "@/components/scroll/useScore";
import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";
import type { ScoreState } from "@/lib/timeline/score";

import hud from "../Hud.module.css";

/**
 * Beat 07: sign-out. The crew member's records, documents and notifications
 * clear one after another with the wipe; then the device is ready.
 */
export function HandoverBlock() {
  const list = useRef<HTMLOListElement>(null);
  const foot = useRef<HTMLParagraphElement>(null);

  const onScore = useCallback((s: ScoreState) => {
    list.current?.querySelectorAll("li").forEach((row, i) => {
      const cleared = s.wipe >= ((i + 1) / 3) * 0.8;
      row.dataset.state = cleared ? "done" : s.wipe > 0 ? "current" : "pending";
      const status = row.querySelector("[data-status]");
      if (status !== null) {
        status.textContent = cleared
          ? COPY.handover.cleared
          : COPY.handover.signingOut;
      }
    });
    if (foot.current !== null) {
      foot.current.dataset.arrive = s.wipe >= 0.9 ? "true" : "false";
    }
  }, []);
  useScore("handover", onScore);

  return (
    <StageBlock id="handover">
      <Words
        id="handover"
        eyebrow={COPY.handover.eyebrow}
        headline={COPY.handover.headline}
        lead={COPY.handover.lead}
      />
      <ol ref={list} className={hud.list}>
        {COPY.handover.items.map((item, i) => (
          <li
            key={item}
            className={hud.row}
            data-state="pending"
            data-arrive="true"
          >
            <span className={`${hud.index} tabular`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={hud.label}>{item}</span>
            <span className={hud.status} data-status>
              {COPY.handover.signingOut}
            </span>
          </li>
        ))}
      </ol>
      <p ref={foot} className={`${hud.foot} ${hud.row}`} data-arrive="false">
        <span className={hud.label}>{COPY.handover.ready}</span>
      </p>
    </StageBlock>
  );
}
