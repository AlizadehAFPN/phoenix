"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  LinearMipmapLinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  type Texture,
  WebGLRenderTarget,
} from "three";

import { CLOUDS_FRAGMENT, CLOUDS_VERTEX } from "./shaders/clouds";

const WIDTH = 2048;
const HEIGHT = 1024;
/** How often the drift is re-baked while motion is allowed. */
const REBAKE_MS = 600;
/** A bake is spread over this many frames, one horizontal stripe each, so no
    single frame pays for the whole sky. */
const STRIPES = 4;

/**
 * The cloud cover as a texture, baked on the GPU (see shaders/clouds.ts).
 * Re-baked every half second while the clouds drift; once, and never
 * again, with reduced motion or off the top tier.
 */
export function useCloudMap(enabled: boolean, motion: boolean): Texture | null {
  const gl = useThree((s) => s.gl);
  const lastBake = useRef(-Infinity);
  const stripe = useRef(STRIPES);
  const bakeTime = useRef(0);

  const bake = useMemo(() => {
    if (!enabled) return null;
    const target = new WebGLRenderTarget(WIDTH, HEIGHT, {
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    target.texture.wrapS = RepeatWrapping;
    target.texture.anisotropy = 4;
    const material = new ShaderMaterial({
      vertexShader: CLOUDS_VERTEX,
      fragmentShader: CLOUDS_FRAGMENT,
      uniforms: { uTime: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    });
    const scene = new Scene();
    scene.add(new Mesh(new PlaneGeometry(2, 2), material));
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { target, material, scene, camera };
  }, [enabled]);

  useEffect(() => {
    return () => {
      bake?.target.dispose();
      bake?.material.dispose();
    };
  }, [bake]);

  useFrame((state) => {
    if (bake === null) return;
    const now = state.clock.elapsedTime * 1000;

    /* Start a new bake when one is due; then draw one stripe per frame
       until the sky is complete. The whole sky uses one time value, so the
       stripes agree with each other. */
    if (stripe.current >= STRIPES) {
      const due = motion
        ? now - lastBake.current >= REBAKE_MS
        : lastBake.current === -Infinity;
      if (!due) return;
      lastBake.current = now;
      bakeTime.current = state.clock.elapsedTime;
      stripe.current = 0;
    }

    bake.material.uniforms.uTime!.value = bakeTime.current;
    const previous = gl.getRenderTarget();
    const stripeHeight = HEIGHT / STRIPES;
    /* The scissor lives on the target: the renderer's own scissor is in CSS
       pixels and scaled by the pixel ratio, and it would leak into the
       frame that follows. */
    bake.target.scissorTest = true;
    bake.target.scissor.set(
      0,
      stripe.current * stripeHeight,
      WIDTH,
      stripeHeight,
    );
    gl.setRenderTarget(bake.target);
    gl.render(bake.scene, bake.camera);
    gl.setRenderTarget(previous);
    stripe.current += 1;
  });

  return bake?.target.texture ?? null;
}
