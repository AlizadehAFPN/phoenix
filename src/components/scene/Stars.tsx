"use client";

import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color } from "three";

import { hexToRgb, palette } from "@/theme";

/**
 * A procedural star field (BRIEF §4: no catalogue, so no share-alike
 * licence). A seeded distribution on a far sphere — a scattered sky plus a
 * faint band of denser, fainter stars for the galaxy's plane — brightness
 * by a rough magnitude law, no twinkle: the sky behind an instrument does
 * not sparkle.
 */
const SKY_COUNT = 2600;
const BAND_COUNT = 7000;
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

/** A unit vector of a gaussian deviate (Box–Muller) around a great circle. */
function gaussian(random: () => number): number {
  const u = Math.max(1e-9, random());
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function Stars() {
  const geometry = useMemo(() => {
    const random = seeded(20260926);
    const count = SKY_COUNT + BAND_COUNT;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const [r, g, b] = hexToRgb(palette.grey.white);
    const white = new Color(r, g, b);

    const put = (
      i: number,
      x: number,
      y: number,
      z: number,
      brightness: number,
    ) => {
      positions[i * 3] = x * RADIUS;
      positions[i * 3 + 1] = y * RADIUS;
      positions[i * 3 + 2] = z * RADIUS;
      colors[i * 3] = white.r * brightness;
      colors[i * 3 + 1] = white.g * brightness;
      colors[i * 3 + 2] = white.b * brightness;
    };

    /* The scattered sky: uniform on the sphere, most stars faint. */
    for (let i = 0; i < SKY_COUNT; i += 1) {
      const z = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const s = Math.sqrt(1 - z * z);
      const m = random();
      put(i, s * Math.cos(a), z, s * Math.sin(a), 0.16 + 0.84 * m * m * m);
    }

    /* The band: a great circle tilted away from the globe's equator, with a
       gaussian spread of about seven degrees either side, all faint. */
    const tilt = 1.08;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    for (let i = 0; i < BAND_COUNT; i += 1) {
      const along = random() * Math.PI * 2;
      const off = gaussian(random) * 0.12;
      /* On the circle in the XZ plane, lifted by `off`, then tilted about X. */
      const x0 = Math.cos(along) * Math.cos(off);
      const y0 = Math.sin(off);
      const z0 = Math.sin(along) * Math.cos(off);
      const y = y0 * ct - z0 * st;
      const z = y0 * st + z0 * ct;
      const m = random();
      put(SKY_COUNT + i, x0, y, z, 0.04 + 0.22 * m * m);
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
