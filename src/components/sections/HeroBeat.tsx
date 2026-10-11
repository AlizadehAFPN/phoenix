import { Beat } from "@/components/scroll/Beat";
import { CopyCard } from "@/components/ui/CopyCard";
import { COPY } from "@/content/copy";

import styles from "./HeroBeat.module.css";

/** Beat 00: before dawn. The Earth is the scene's; this is the headline. */
export function HeroBeat() {
  return (
    <Beat id="hero">
      <div className={`container ${styles.hero}`}>
        <CopyCard
          as="h1"
          hero
          eyebrow={COPY.hero.eyebrow}
          headline={COPY.hero.headline}
          lead={COPY.hero.lead}
        >
          <div className={styles.actions}>
            <a className={styles.cta} href="#demo">
              {COPY.hero.cta}
            </a>
            <a className={styles.scroll} href="#roster">
              {COPY.hero.scroll}
            </a>
          </div>
        </CopyCard>
      </div>
    </Beat>
  );
}
