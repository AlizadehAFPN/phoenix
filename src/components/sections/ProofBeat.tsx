import { Beat } from "@/components/scroll/Beat";
import { CapturePanel } from "@/components/ui/CapturePanel";
import { COPY } from "@/content/copy";

import styles from "./ProofBeat.module.css";

/** Beat 08: the five shipped proof points, as one instrument strip. */
export function ProofBeat() {
  return (
    <Beat id="proof">
      <div className={`container ${styles.proof}`}>
        <p className={styles.eyebrow} data-reveal>
          {COPY.proof.eyebrow}
        </p>
        <ul className={styles.strip}>
          {COPY.proof.items.map((item, i) => (
            <li
              key={item.title}
              className={styles.item}
              data-reveal
              style={{ "--i": i } as React.CSSProperties}
            >
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.body}>{item.body}</p>
            </li>
          ))}
        </ul>
        <div
          className={styles.modes}
          data-reveal
          style={{ "--i": 5 } as React.CSSProperties}
        >
          <CapturePanel
            id="proof-dark"
            label="Dark mode"
            alt={COPY.proof.modesAlt}
          />
          <CapturePanel
            id="proof-light"
            label="Light mode"
            alt={COPY.proof.modesAlt}
          />
        </div>
      </div>
    </Beat>
  );
}
