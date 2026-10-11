"use client";

import { useThree } from "@react-three/fiber";
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
 * still settling, and — on the top tier only — at a gentle rate for the
 * clouds' drift, and never while the tab is hidden.
 */
export function Scene({
  tier,
  motion,
}: {
  readonly tier: Exclude<Tier, "none">;
  readonly motion: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => subscribeScroll(() => invalidate()), [invalidate]);

  useEffect(() => {
    if (tier !== "a" || !motion) return undefined;
    let handle = 0;
    let last = 0;
    const tick = (now: number) => {
      handle = requestAnimationFrame(tick);
      if (document.visibilityState !== "visible") return;
      /* About 24 frames a second is plenty for a drift nobody is meant to notice. */
      if (now - last < 1000 / 24) return;
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
      <Globe tier={tier} motion={motion} />
      <Route day={THEME.day} />
    </>
  );
}
