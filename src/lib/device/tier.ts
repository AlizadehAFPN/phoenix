/**
 * Which rendering tier a device gets (STORYBOARD §5).
 *
 *   A  desktop, iPad Pro, Apple Silicon: 8K textures, clouds, the works
 *   B  iPad Air/mini, iPhone Pro:        4K textures, no clouds
 *   C  iPhone 16 / iOS 18, low memory:   2K textures, a still globe drawn
 *                                        only when the scroll moves
 *   none  no WebGL2: the still image instead of a canvas
 *
 * Decided from what the browser will say — the largest texture it accepts,
 * device memory where exposed, the pointer type — and never from the
 * user-agent string alone, which lies. A few-frame timing probe can
 * downgrade a tier after the first render; that lives in the scene.
 */

export type Tier = "a" | "b" | "c" | "none";

export interface TierInput {
  readonly webgl2: boolean;
  readonly maxTextureSize: number;
  /** `navigator.deviceMemory` in GiB, where the browser exposes it (not on Safari). */
  readonly deviceMemory: number | null;
  readonly hardwareConcurrency: number;
  readonly coarsePointer: boolean;
  readonly viewportWidth: number;
  readonly devicePixelRatio: number;
}

export function chooseTier(input: TierInput): Tier {
  if (!input.webgl2) return "none";
  if (input.maxTextureSize < 4096) return "c";

  const phone = input.coarsePointer && input.viewportWidth < 768;
  const lowMemory = input.deviceMemory !== null && input.deviceMemory <= 4;

  if (phone) {
    /* A phone never gets the 8K tier: the textures alone would be most of
       its GPU budget. Few cores or little memory is the lowest tier. */
    if (
      lowMemory ||
      input.hardwareConcurrency <= 4 ||
      input.maxTextureSize < 8192
    )
      return "c";
    return "b";
  }

  if (input.coarsePointer) {
    /* Tablets. An iPad that reports 16384 and six or more cores is a Pro or
       a recent Air; anything less is the middle tier. */
    return input.maxTextureSize >= 16384 && input.hardwareConcurrency >= 6
      ? "a"
      : "b";
  }

  if (input.maxTextureSize < 8192 || lowMemory) return "b";
  return "a";
}

/** The largest globe texture each tier loads, in pixels of width. */
export const TIER_TEXTURE_WIDTH: Readonly<
  Record<Exclude<Tier, "none">, 2048 | 4096 | 8192>
> = {
  a: 8192,
  b: 4096,
  c: 2048,
};

/** Device pixel ratio cap per tier. */
export const TIER_DPR_CAP: Readonly<Record<Exclude<Tier, "none">, number>> = {
  a: 2,
  b: 2,
  c: 1.5,
};

/** Reads the inputs from the browser. Call on the client only. */
export function probeDevice(): TierInput {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  const maxTextureSize =
    gl === null ? 0 : (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
  /* Release the context straight away; the scene makes its own. */
  gl?.getExtension("WEBGL_lose_context")?.loseContext();

  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    webgl2: gl !== null,
    maxTextureSize,
    deviceMemory:
      typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency: navigator.hardwareConcurrency || 2,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio,
  };
}
