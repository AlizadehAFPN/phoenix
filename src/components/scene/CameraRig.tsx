"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";

import { ease } from "@/lib/motion/easing";
import { readScroll } from "@/lib/scroll/scroll-state";
import { THEME } from "@/theme";

import { poseAt } from "./camera";

/**
 * Drives the camera from the score.
 *
 * THE TARGET POSE comes from `poseAt`. On top of it, three things that make
 * the frame feel held rather than parked:
 *
 * - THE OPENING. For the first 2.6 s the camera glides in from further out,
 *   rotated west and a little higher, on the app's `climb` curve — the way
 *   the splash arrives rather than cuts. Scrolling ends it at once.
 * - THE DRIFT. An imperceptible slow orbit around the look point while the
 *   reader is still, like the splash's `sceneDrift`: a frame that is
 *   imperceptibly moving reads as photographed, one that is locked reads as
 *   a wallpaper.
 * - THE POINTER. On a fine pointer, a very small parallax toward the mouse.
 *
 * The camera follows the sum with critically damped smoothing, so a fast
 * scroll is a glide rather than a jump, and asks for frames only until it
 * has settled. With reduced motion none of the three apply and the camera
 * simply goes where the score says.
 */
const DAMPING = 5.5;
const SETTLED = 1e-5;
const INTRO_SECONDS = 2.6;
const INTRO_YAW = 0.24;
const INTRO_PITCH = 0.1;
const INTRO_BACK = 0.55;
const DRIFT = 0.0045;
const PARALLAX_X = 0.014;
const PARALLAX_Y = 0.009;

const Y_AXIS = new Vector3(0, 1, 0);

export function CameraRig({ motion }: { readonly motion: boolean }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);

  const eye = useRef(new Vector3());
  const look = useRef(new Vector3());
  const targetEye = useRef(new Vector3());
  const targetLook = useRef(new Vector3());
  const primed = useRef(false);
  const intro = useRef({ start: -1, done: !motion });
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const scratch = useRef({
    forward: new Vector3(),
    right: new Vector3(),
    up: new Vector3(),
    offset: new Vector3(),
    axis: new Vector3(),
    from: new Vector3(),
  });

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.near = 0.01;
      camera.far = 80;
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);

  useEffect(() => {
    if (!motion || !window.matchMedia("(pointer: fine)").matches) {
      return undefined;
    }
    const move = (event: PointerEvent) => {
      pointer.current.tx = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.ty = (event.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [motion, invalidate]);

  useFrame((state, delta) => {
    const { beat, progress, score } = readScroll();
    const pose = poseAt(beat, progress, score.clock, THEME.day);
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 20);
    const s = scratch.current;

    targetEye.current.set(pose.eye[0], pose.eye[1], pose.eye[2]);
    targetLook.current.set(pose.look[0], pose.look[1], pose.look[2]);

    /* The opening: the eye starts further out, swung west around the globe's
       axis and lifted, and settles onto the hero's pose. */
    const opening = intro.current;
    if (!opening.done) {
      if (opening.start < 0) opening.start = t;
      const k = (t - opening.start) / INTRO_SECONDS;
      if (k >= 1 || beat !== "hero" || progress > 0.03) {
        opening.done = true;
      } else {
        const remaining = 1 - ease("climb", k);
        const radius = targetEye.current.length();
        s.axis.copy(targetEye.current).normalize().cross(Y_AXIS).normalize();
        s.from
          .copy(targetEye.current)
          .normalize()
          .applyAxisAngle(Y_AXIS, INTRO_YAW * remaining)
          .applyAxisAngle(s.axis, -INTRO_PITCH * remaining)
          .multiplyScalar(radius + INTRO_BACK * remaining);
        targetEye.current.copy(s.from);
        invalidate();
      }
    }

    if (!primed.current || !motion) {
      eye.current.copy(targetEye.current);
      look.current.copy(targetLook.current);
      primed.current = true;
    } else {
      const te = targetEye.current;
      const tl = targetLook.current;
      eye.current.x = MathUtils.damp(eye.current.x, te.x, DAMPING, dt);
      eye.current.y = MathUtils.damp(eye.current.y, te.y, DAMPING, dt);
      eye.current.z = MathUtils.damp(eye.current.z, te.z, DAMPING, dt);
      look.current.x = MathUtils.damp(look.current.x, tl.x, DAMPING, dt);
      look.current.y = MathUtils.damp(look.current.y, tl.y, DAMPING, dt);
      look.current.z = MathUtils.damp(look.current.z, tl.z, DAMPING, dt);
    }

    /* The drift and the pointer, in the camera's own right/up axes, scaled
       by the distance to the look point so they read the same at every
       altitude. */
    s.forward.copy(look.current).sub(eye.current);
    const distance = s.forward.length();
    s.forward.normalize();
    s.right.crossVectors(s.forward, Y_AXIS).normalize();
    s.up.crossVectors(s.right, s.forward).normalize();
    s.offset.set(0, 0, 0);
    if (motion) {
      const p = pointer.current;
      p.x = MathUtils.damp(p.x, p.tx, 3, dt);
      p.y = MathUtils.damp(p.y, p.ty, 3, dt);
      const dx = Math.sin(t * 0.17) * DRIFT + p.x * PARALLAX_X;
      const dy = Math.cos(t * 0.13) * DRIFT * 0.7 - p.y * PARALLAX_Y;
      s.offset
        .addScaledVector(s.right, dx * distance)
        .addScaledVector(s.up, dy * distance);
    }

    camera.position.copy(eye.current).add(s.offset);
    camera.up.set(0, 1, 0);
    camera.lookAt(look.current);

    /* The anchor: shift the frustum so the look point lands where the
       layout leaves room for it. Phones put the words at the bottom, so
       the point of interest goes to the upper third instead. */
    if (camera instanceof PerspectiveCamera) {
      const portrait = size.height > size.width;
      const fov = portrait ? 58 : 42;
      if (camera.fov !== fov) camera.fov = fov;
      const [ax, ay] = portrait ? [0.5, 0.3] : pose.anchor;
      const dpr = state.viewport.dpr;
      const w = size.width * dpr;
      const h = size.height * dpr;
      camera.setViewOffset(w, h, (0.5 - ax) * w, (0.5 - ay) * h, w, h);
    }

    const remaining =
      eye.current.distanceToSquared(targetEye.current) +
      look.current.distanceToSquared(targetLook.current) +
      (pointer.current.x - pointer.current.tx) ** 2 +
      (pointer.current.y - pointer.current.ty) ** 2;
    if (remaining > SETTLED) invalidate();
  });

  return null;
}
