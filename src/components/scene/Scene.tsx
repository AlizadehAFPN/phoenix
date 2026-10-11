"use client";

import {
  Bloom,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { ToneMappingMode } from "postprocessing";
import { useEffect } from "react";

import type { Tier } from "@/lib/device/tier";
import { subscribeScroll } from "@/lib/scroll/scroll-state";
import { THEME } from "@/theme";

import { CameraRig } from "./CameraRig";
import { Globe } from "./Globe";
import { Route } from "./Route";
import { Stars } from "./Stars";

/**
 * Everything inside the canvas. The frame loop is on demand: a frame is
 * drawn when the scroll moves, when a texture arrives, while the camera is
 * still settling, and — with motion allowed, on the two upper tiers — at a
 * gentle rate for the clouds' drift and the camera's, never while the tab
 * is hidden.
 *
 * THE GLOW IS SELECTIVE BY CONSTRUCTION. The scene renders in linear HDR;
 * the surface never exceeds 1.0 by day, while the city lights, the line's
 * head and tail and the sun's glint on the water are written above it. The
 * bloom's threshold sits at 1.0, so only those bloom and the planet itself
 * stays crisp. Tone mapping comes after the bloom, then the vignette and a
 * film grain light enough to keep the atmosphere's gradients from banding.
 */
export function Scene({
  tier,
  motion,
  post = true,
  clouds = true,
}: {
  readonly tier: Exclude<Tier, "none">;
  readonly motion: boolean;
  readonly post?: boolean | undefined;
  readonly clouds?: boolean | undefined;
}) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => subscribeScroll(() => invalidate()), [invalidate]);

  useEffect(() => {
    if (tier === "c" || !motion) return undefined;
    let handle = 0;
    let last = 0;
    const tick = (now: number) => {
      handle = requestAnimationFrame(tick);
      if (document.visibilityState !== "visible") return;
      /* About 30 frames a second: enough for a drift nobody is meant to notice. */
      if (now - last < 1000 / 30) return;
      last = now;
      invalidate();
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [tier, motion, invalidate]);

  return (
    <>
      <CameraRig motion={motion} />
      <Stars />
      <Globe tier={tier} motion={motion} clouds={clouds} />
      <Route day={THEME.day} />
      {post && tier !== "c" ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            luminanceThreshold={1}
            luminanceSmoothing={0.35}
            intensity={1.15}
            mipmapBlur
            radius={0.72}
            levels={5}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette eskil={false} offset={0.22} darkness={0.55} />
          <Noise opacity={0.022} premultiply />
        </EffectComposer>
      ) : null}
    </>
  );
}
