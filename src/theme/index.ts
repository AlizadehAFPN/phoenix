/**
 * The token barrel. Components import from here, never from the generated
 * files directly, so the mode-aware layer and the site additions stay in
 * one place.
 */

export {
  blur,
  border,
  fontWeight,
  opacity,
  palette,
  radius,
  semanticColors,
  space,
  typography,
  type ThemeMode,
} from "./tokens.generated";
export {
  THEME,
  THEMES,
  type ThemeConfig,
  type LogoAsset,
} from "./theme-config";

/**
 * A `#rrggbb` or `#rrggbbaa` token as linear-ish floats for the scene. The
 * scene's materials want numbers, and this is the one place a hex string is
 * taken apart, so the eslint rule against literal colours can stay strict
 * everywhere else.
 */
export function hexToRgb(
  hex: string,
): readonly [number, number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = clean.length >= 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}
