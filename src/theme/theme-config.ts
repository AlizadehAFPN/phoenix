/**
 * White-label configuration (BRIEF §1, §3).
 *
 * The generic theme is the default; an airline variant is another entry in
 * `THEMES` plus its assets, selected at build time with
 * `NEXT_PUBLIC_SITE_THEME`, which is a public identifier and on the env
 * allow-list. A variant is a config file, never a fork.
 *
 * The logo is a SLOT. The default is a "Phoenix" wordmark set in Geist Thin,
 * the treatment the app gives its own wordmark, because every logo file in
 * the app's assets is create-expo-app template art (BRIEF §2.4). Dropping in
 * the real logo is one SVG under `public/brand/` and one `logo` entry here.
 */

import { GENERIC_DAY, type Day } from "@/lib/day/day";

export interface LogoAsset {
  /** Under `public/`. */
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface ThemeConfig {
  readonly id: string;
  /** The product name as copy says it: "Phoenix", never "iPad Phoenix". */
  readonly productName: string;
  /** The wordmark text, used when `logo` is absent. */
  readonly wordmark: string;
  readonly logo?: LogoAsset;
  /**
   * The legal name in the footer. A placeholder until the owner names the
   * selling entity (BRIEF A1); no country is shown until there is one.
   */
  readonly legalName: string;
  readonly day: Day;
  /**
   * Airline variants are private until the airline gives written permission
   * (BRIEF §7): `noindex` keeps them out of search.
   */
  readonly indexable: boolean;
}

export const THEMES: Readonly<Record<string, ThemeConfig>> = {
  generic: {
    id: "generic",
    productName: "Phoenix",
    wordmark: "Phoenix",
    legalName: "Phoenix",
    day: GENERIC_DAY,
    indexable: true,
  },
};

const requested = process.env.NEXT_PUBLIC_SITE_THEME ?? "generic";
const resolved = THEMES[requested];
if (resolved === undefined) {
  throw new Error(
    `NEXT_PUBLIC_SITE_THEME="${requested}" is not a theme in src/theme/theme-config.ts`,
  );
}

export const THEME: ThemeConfig = resolved;
