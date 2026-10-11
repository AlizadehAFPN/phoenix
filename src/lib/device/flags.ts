/**
 * Query-string switches for measuring the scene, in development only:
 *
 *   ?tier=a|b|c   force a tier
 *   ?nopost       no post-processing
 *   ?noclouds     no clouds
 *   ?dpr=1.5      cap the device pixel ratio
 *
 * Production ignores them all; the tier comes from the device.
 */

import type { Tier } from "./tier";

export interface SceneFlags {
  readonly tier: Exclude<Tier, "none"> | null;
  readonly post: boolean;
  readonly clouds: boolean;
  readonly dpr: number | null;
}

export function sceneFlags(): SceneFlags {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return { tier: null, post: true, clouds: true, dpr: null };
  }
  const params = new URLSearchParams(window.location.search);
  const tier = params.get("tier");
  const dpr = Number(params.get("dpr"));
  return {
    tier: tier === "a" || tier === "b" || tier === "c" ? tier : null,
    post: !params.has("nopost"),
    clouds: !params.has("noclouds"),
    dpr: Number.isFinite(dpr) && dpr > 0 ? dpr : null,
  };
}
