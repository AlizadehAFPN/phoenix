"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";

import { readScroll } from "@/lib/scroll/scroll-state";
import { THEME } from "@/theme";

import { poseAt } from "./camera";

/**
 * Drives the camera from the score. The target pose comes from `poseAt`; the
 * camera follows it with critically damped smoothing, so a fast scroll is a
 * glide rather than a jump, and asks for frames only until it has settled.
 * With reduced motion the camera simply goes where the score says.
 */
const DAMPING = 5.5;
const SETTLED = 1e-5;

export function CameraRig({ motion }: { readonly motion: boolean }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);

  const eye = useRef(new Vector3());
  const look = useRef(new Vector3());
  const targetEye = useRef(new Vector3());
  const targetLook = useRef(new Vector3());
  const primed = useRef(false);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      /* A narrower field on a wide screen, a wider one in portrait, so the
         globe fills a phone the way it fills a monitor. */
      camera.fov = size.width > size.height ? 42 : 58;
      camera.near = 0.01;
      camera.far = 80;
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);

  useFrame((state, delta) => {
    const { beat, progress, score } = readScroll();
    const pose = poseAt(beat, progress, score.clock, THEME.day);
    targetEye.current.set(pose.eye[0], pose.eye[1], pose.eye[2]);
    targetLook.current.set(pose.look[0], pose.look[1], pose.look[2]);

    if (!primed.current || !motion) {
      eye.current.copy(targetEye.current);
      look.current.copy(targetLook.current);
      primed.current = true;
    } else {
      const dt = Math.min(delta, 1 / 20);
      eye.current.x = MathUtils.damp(
        eye.current.x,
        targetEye.current.x,
        DAMPING,
        dt,
      );
      eye.current.y = MathUtils.damp(
        eye.current.y,
        targetEye.current.y,
        DAMPING,
        dt,
      );
      eye.current.z = MathUtils.damp(
        eye.current.z,
        targetEye.current.z,
        DAMPING,
        dt,
      );
      look.current.x = MathUtils.damp(
        look.current.x,
        targetLook.current.x,
        DAMPING,
        dt,
      );
      look.current.y = MathUtils.damp(
        look.current.y,
        targetLook.current.y,
        DAMPING,
        dt,
      );
      look.current.z = MathUtils.damp(
        look.current.z,
        targetLook.current.z,
        DAMPING,
        dt,
      );
    }

    camera.position.copy(eye.current);
    camera.up.set(0, 1, 0);
    camera.lookAt(look.current);

    /* The anchor: shift the frustum so the look point lands where the
       layout leaves room for it. Phones put the copy above the panel, so
       the point of interest goes to the upper middle instead. */
    if (camera instanceof PerspectiveCamera) {
      const portrait = size.height > size.width;
      const [ax, ay] = portrait ? [0.5, 0.3] : pose.anchor;
      const dpr = state.viewport.dpr;
      const w = size.width * dpr;
      const h = size.height * dpr;
      camera.setViewOffset(w, h, (0.5 - ax) * w, (0.5 - ay) * h, w, h);
    }

    const remaining =
      eye.current.distanceToSquared(targetEye.current) +
      look.current.distanceToSquared(targetLook.current);
    if (remaining > SETTLED) invalidate();
  });

  return null;
}
