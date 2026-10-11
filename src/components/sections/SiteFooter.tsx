import { COPY } from "@/content/copy";

import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.legal}>{COPY.footer.legal}</p>
        <p className={styles.line}>{COPY.footer.apple}</p>
        <p className={styles.line}>{COPY.footer.credits}</p>
      </div>
    </footer>
  );
}
