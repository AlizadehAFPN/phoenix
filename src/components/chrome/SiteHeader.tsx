import { COPY } from "@/content/copy";

import { BrandLogo } from "./BrandLogo";
import { DutyBar } from "./DutyBar";
import styles from "./SiteHeader.module.css";
import { ZuluClock } from "./ZuluClock";

/**
 * The persistent chrome (STORYBOARD §3): the brand slot, the Zulu clock with
 * the duty bar under it, and the one call to action.
 */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <BrandLogo />
        <div className={styles.instrument} aria-hidden="true">
          <ZuluClock />
          <DutyBar />
        </div>
        <a className={styles.demo} href="#demo">
          <span className={styles.demoLong}>{COPY.chrome.demo}</span>
          <span className={styles.demoShort}>{COPY.chrome.demoShort}</span>
        </a>
      </div>
    </header>
  );
}
