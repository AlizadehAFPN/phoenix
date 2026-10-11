"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  ShaderMaterial,
  Vector3,
  Vector4,
} from "three";

import { sunDirection } from "@/lib/day/sun";
import type { Tier } from "@/lib/device/tier";
import { readScroll } from "@/lib/scroll/scroll-state";
import { hexToRgb, palette, THEME } from "@/theme";

import {
  ATMOSPHERE_FRAGMENT,
  ATMOSPHERE_VERTEX,
  GLOBE_FRAGMENT,
  GLOBE_VERTEX,
} from "./shaders/globe";
import { useGlobeTextures } from "./useGlobeTextures";

/**
 * The planet and its atmosphere. The sun's direction is recomputed every
 * frame from the page's clock, so the terminator is wherever the score says
 * it is (STORYBOARD §1).
 *
 * UNIFORMS ARE WRITTEN THROUGH THE MATERIAL REFS. The `uniforms` prop is
 * copied into the material when it is created, so the object passed in is
 * not the one the shader reads; every per-frame value goes to
 * `material.uniforms` directly.
 */
export function Globe({
  tier,
  motion,
}: {
  readonly tier: Exclude<Tier, "none">;
  readonly motion: boolean;
}) {
  const textures = useGlobeTextures(tier);
  const surface = useRef<ShaderMaterial>(null);
  const shell = useRef<ShaderMaterial>(null);

  const [cr, cg, cb] = hexToRgb(palette.grey.white);
  const coast = useMemo(() => new Color(cr, cg, cb), [cr, cg, cb]);

  /* The initial values only; see the note above. */
  const initialUniforms = useMemo(
    () => ({
      uDay: { value: textures.day },
      uNight: { value: textures.night },
      uDetailDay: { value: textures.detailDay },
      uDetailNight: { value: textures.detailNight },
      uDetailRect: { value: new Vector4(...textures.detailRect) },
      uDetailMix: { value: 0 },
      uSunDir: { value: new Vector3(1, 0, 0) },
      uCameraPos: { value: new Vector3() },
      uTime: { value: 0 },
      uClouds: { value: tier === "a" && motion ? 1 : 0 },
      uCoastColor: { value: coast },
      uCoastAlpha: { value: 0.38 },
    }),
    // Created once; later values are written to the material in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* Two shells: a tight bright rim and a wide soft haze around it. */
  const initialShellUniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector3(1, 0, 0) },
      uCameraPos: { value: new Vector3() },
      uRimPower: { value: 3.0 },
      uIntensity: { value: 1.0 },
    }),
    [],
  );
  const initialHazeUniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector3(1, 0, 0) },
      uCameraPos: { value: new Vector3() },
      uRimPower: { value: 1.6 },
      uIntensity: { value: 0.28 },
    }),
    [],
  );
  const haze = useRef<ShaderMaterial>(null);

  useFrame((state) => {
    const { clock } = readScroll().score;
    const [sx, sy, sz] = sunDirection(THEME.day.date, clock);

    const u = surface.current?.uniforms;
    if (u !== undefined) {
      (u.uSunDir?.value as Vector3).set(sx, sy, sz);
      (u.uCameraPos?.value as Vector3).copy(state.camera.position);
      if (u.uTime !== undefined) u.uTime.value = state.clock.elapsedTime;
      if (u.uDay !== undefined) u.uDay.value = textures.day;
      if (u.uNight !== undefined) u.uNight.value = textures.night;
      if (u.uDetailDay !== undefined) u.uDetailDay.value = textures.detailDay;
      if (u.uDetailNight !== undefined)
        u.uDetailNight.value = textures.detailNight;
      if (u.uDetailMix !== undefined) u.uDetailMix.value = textures.detailMix;
      if (u.uClouds !== undefined)
        u.uClouds.value = tier === "a" && motion ? 1 : 0;
    }

    for (const material of [shell.current, haze.current]) {
      const s = material?.uniforms;
      if (s !== undefined) {
        (s.uSunDir?.value as Vector3).set(sx, sy, sz);
        (s.uCameraPos?.value as Vector3).copy(state.camera.position);
      }
    }
  });

  return (
    <group>
      <mesh renderOrder={1}>
        <sphereGeometry args={[1, 192, 96]} />
        <shaderMaterial
          ref={surface}
          vertexShader={GLOBE_VERTEX}
          fragmentShader={GLOBE_FRAGMENT}
          uniforms={initialUniforms}
        />
      </mesh>
      <mesh renderOrder={3}>
        <sphereGeometry args={[1.06, 96, 48]} />
        <shaderMaterial
          ref={shell}
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_FRAGMENT}
          uniforms={initialShellUniforms}
          side={BackSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh renderOrder={3}>
        <sphereGeometry args={[1.18, 64, 32]} />
        <shaderMaterial
          ref={haze}
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_FRAGMENT}
          uniforms={initialHazeUniforms}
          side={BackSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
