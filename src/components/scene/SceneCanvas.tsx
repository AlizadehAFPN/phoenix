"use client";

import { Canvas } from "@react-three/fiber";
import { useSyncExternalStore } from "react";
import { Color, NoToneMapping } from "three";

import { sceneFlags } from "@/lib/device/flags";
import {
  chooseTier,
  probeDevice,
  TIER_DPR_CAP,
  type Tier,
} from "@/lib/device/tier";
import { hexToRgb, palette, THEME } from "@/theme";

import { Scene } from "./Scene";
import styles from "./SceneCanvas.module.css";
import { SceneLabels } from "./SceneLabels";

/**
 * The fixed, full-viewport canvas behind the page (STORYBOARD §5). It is
 * decorative — every word and every screen is real DOM above it — so it is
 * hidden from assistive technology and takes no pointer events.
 *
 * The tier is read on the client through an external-store snapshot: the
 * server snapshot is "pending", so the server renders only the empty frame
 * and there is nothing to hydrate differently. Without WebGL2 the frame
 * stays empty and the still image behind it shows through.
 */

let probedTier: Tier | null = null;

function readTier(): Tier {
  if (probedTier === null) {
    probedTier = sceneFlags().tier ?? chooseTier(probeDevice());
  }
  return probedTier;
}

function readServerTier(): Tier | null {
  return null;
}

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readMotion(): boolean {
  return !window.matchMedia(REDUCED).matches;
}

function readServerMotion(): boolean {
  return true;
}

export function SceneCanvas() {
  const tier = useSyncExternalStore(
    () => () => undefined,
    readTier,
    readServerTier,
  );
  const motion = useSyncExternalStore(
    subscribeMotion,
    readMotion,
    readServerMotion,
  );

  const [r, g, b] = hexToRgb(palette.grey.dark);
  const flags = sceneFlags();

  return (
    <div
      className={styles.frame}
      aria-hidden="true"
      data-tier={tier ?? "pending"}
    >
      {tier !== null && tier !== "none" ? (
        <Canvas
          frameloop="demand"
          dpr={[1, flags.dpr ?? TIER_DPR_CAP[tier]]}
          gl={{
            antialias: true,
            alpha: false,
            stencil: false,
            powerPreference: "high-performance",
            toneMapping: NoToneMapping,
          }}
          camera={{ fov: 42, near: 0.01, far: 80, position: [0, 0, 3] }}
          onCreated={({ gl }) => {
            gl.setClearColor(new Color(r, g, b), 1);
          }}
        >
          <Scene
            tier={tier}
            motion={motion}
            post={flags.post}
            clouds={flags.clouds}
          />
        </Canvas>
      ) : null}
      {tier !== null && tier !== "none" ? (
        <SceneLabels day={THEME.day} />
      ) : null}
    </div>
  );
}
