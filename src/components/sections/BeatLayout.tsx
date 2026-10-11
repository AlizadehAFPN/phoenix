import type { ReactNode } from "react";

import styles from "./BeatLayout.module.css";

/**
 * The two-column stage every feature beat uses: the copy card on the left,
 * the screen panels on the right, in a perspective so a panel can turn a
 * few degrees toward the reader. Stacks on narrow screens.
 */
export function BeatLayout({
  copy,
  children,
  stageClassName,
  stageRef,
}: {
  readonly copy: ReactNode;
  readonly children: ReactNode;
  readonly stageClassName?: string | undefined;
  readonly stageRef?: React.Ref<HTMLDivElement> | undefined;
}) {
  return (
    <div className={`container ${styles.layout}`}>
      <div className={styles.copy}>{copy}</div>
      <div
        ref={stageRef}
        className={[styles.stage, stageClassName ?? ""].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
