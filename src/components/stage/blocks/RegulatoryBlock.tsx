import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";

import styles from "../Stage.module.css";

/** Beat 09: three lines on the regulatory frame. Text only. */
export function RegulatoryBlock() {
  return (
    <StageBlock id="regulatory">
      <Words
        id="regulatory"
        eyebrow={COPY.regulatory.eyebrow}
        headline={COPY.regulatory.headline}
      >
        {COPY.regulatory.body.map((line) => (
          <p key={line} className={styles.lead}>
            {line}
          </p>
        ))}
      </Words>
    </StageBlock>
  );
}
