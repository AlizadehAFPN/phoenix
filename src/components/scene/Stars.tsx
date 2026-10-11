"use client";

import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color } from "three";

import { hexToRgb, palette } from "@/theme";

/**
 * A procedural star field (BRIEF §4: no catalogue, so no share-alike
 * licence). A seeded distribution on a far sphere, brightness by a rough
 * magnitude law, no twinkle: the sky behind an instrument does not sparkle.
 */
const COUNT = 2600;
const RADIUS = 40;

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Stars() {
  const geometry = useMemo(() => {
    const random = seeded(20260926);
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const [r, g, b] = hexToRgb(palette.grey.white);
    const white = new Color(r, g, b);
    for (let i = 0; i < COUNT; i += 1) {
      /* Uniform on the sphere: z uniform in [−1, 1], angle uniform. */
      const z = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const s = Math.sqrt(1 - z * z);
      positions[i * 3] = s * Math.cos(a) * RADIUS;
      positions[i * 3 + 1] = z * RADIUS;
      positions[i * 3 + 2] = s * Math.sin(a) * RADIUS;
      /* Most stars faint, a few bright: a cube of a uniform draw. */
      const m = random();
      const brightness = 0.18 + 0.82 * m * m * m;
      colors[i * 3] = white.r * brightness;
      colors[i * 3 + 1] = white.g * brightness;
      colors[i * 3 + 2] = white.b * brightness;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry} renderOrder={0} frustumCulled={false}>
      <pointsMaterial
        size={1.4}
        sizeAttenuation={false}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
