import { Beat } from "@/components/scroll/Beat";
import { CopyCard } from "@/components/ui/CopyCard";
import { COPY } from "@/content/copy";

import styles from "./RegulatoryBeat.module.css";

/** Beat 09: three lines on the regulatory frame. Text only. */
export function RegulatoryBeat() {
  return (
    <Beat id="regulatory">
      <div className={`container ${styles.regulatory}`}>
        <CopyCard
          eyebrow={COPY.regulatory.eyebrow}
          headline={COPY.regulatory.headline}
        >
          {COPY.regulatory.body.map((line) => (
            <p key={line} className={styles.line}>
              {line}
            </p>
          ))}
        </CopyCard>
      </div>
    </Beat>
  );
}
