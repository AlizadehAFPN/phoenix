import Image from "next/image";

import { THEME } from "@/theme";

import styles from "./BrandLogo.module.css";

/**
 * The logo slot (BRIEF §1). With no `logo` in the theme config it is the
 * product wordmark in Geist Thin, the app's own treatment for its wordmark;
 * with one, it is that SVG, unmodified.
 */
export function BrandLogo() {
  const logo = THEME.logo;
  return (
    <a className={styles.brand} href="#hero" aria-label={THEME.productName}>
      {logo === undefined ? (
        <span className={styles.wordmark}>{THEME.wordmark}</span>
      ) : (
        <Image
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          priority
        />
      )}
    </a>
  );
}
