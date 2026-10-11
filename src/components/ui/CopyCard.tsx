import type { ReactNode } from "react";

import styles from "./CopyCard.module.css";

/**
 * A beat's words, on the app's glass: the login card's own treatment —
 * glass fill, backdrop blur, edge stroke, the diagonal shadow ramp — in
 * whichever mode the reader's system is in. Each line reveals once, as one
 * fade and one rise, never per letter.
 */
export function CopyCard({
  eyebrow,
  headline,
  lead,
  children,
  as: Heading = "h2",
  hero = false,
}: {
  readonly eyebrow: string;
  readonly headline: string;
  readonly lead?: string;
  readonly children?: ReactNode;
  readonly as?: "h1" | "h2";
  readonly hero?: boolean;
}) {
  return (
    <div className={[styles.card, hero ? styles.hero : ""].join(" ")}>
      <p
        className={styles.eyebrow}
        data-reveal
        style={{ "--i": 0 } as React.CSSProperties}
      >
        {eyebrow}
      </p>
      <Heading
        className={styles.headline}
        data-reveal
        style={{ "--i": 1 } as React.CSSProperties}
      >
        {headline}
      </Heading>
      {lead !== undefined ? (
        <p
          className={styles.lead}
          data-reveal
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {lead}
        </p>
      ) : null}
      {children !== undefined ? (
        <div
          className={styles.extra}
          data-reveal
          style={{ "--i": 3 } as React.CSSProperties}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
