import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";

import styles from "../Stage.module.css";

/** Beat 00: before dawn. The Earth is the scene's; this is the headline. */
export function HeroBlock() {
  return (
    <StageBlock id="hero" className={styles.hero}>
      <Words
        id="hero"
        as="h1"
        eyebrow={COPY.hero.eyebrow}
        headline={COPY.hero.headline}
        lead={COPY.hero.lead}
      >
        <div className={styles.actions}>
          <a className={styles.cta} href="#demo">
            {COPY.hero.cta}
          </a>
          <a className={styles.quiet} href="#roster">
            {COPY.hero.scroll}
          </a>
        </div>
      </Words>
    </StageBlock>
  );
}
