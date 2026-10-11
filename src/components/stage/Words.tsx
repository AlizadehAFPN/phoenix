import type { ReactNode } from "react";

import type { BeatId } from "@/lib/timeline/beats";

import styles from "./Stage.module.css";

/**
 * A beat's words: eyebrow, headline, lead. The headline carries the id the
 * block's `aria-labelledby` points at.
 */
export function Words({
  id,
  eyebrow,
  headline,
  lead,
  as: Heading = "h2",
  children,
}: {
  readonly id: BeatId;
  readonly eyebrow: string;
  readonly headline: string;
  readonly lead?: string | undefined;
  readonly as?: "h1" | "h2";
  readonly children?: ReactNode;
}) {
  return (
    <>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <Heading id={`${id}-headline`} className={styles.headline}>
        {headline}
      </Heading>
      {lead !== undefined ? <p className={styles.lead}>{lead}</p> : null}
      {children}
    </>
  );
}
