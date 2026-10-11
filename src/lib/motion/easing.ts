/**
 * The site's easing curves — the app's, verbatim.
 *
 * Copied from the Phoenix app's `src/components/splash/splash-timeline.ts`,
 * which is where the restraint the whole site follows is written down: every
 * curve is monotone, with no `back`, no `elastic`, no spring, because
 * overshoot is the single most consumer-sounding thing motion can do and
 * this product is sold to airlines. Durations are the splash's too; the page
 * uses them as its unit of time wherever a beat is not scrubbed by scroll.
 *
 * Stated as bezier control points so the same values serve CSS
 * (`cubic-bezier(...)`), GSAP (`CustomEase`) and anything that interpolates
 * by hand. Nothing here is a design token in the app's sense — the Figma file
 * carries no motion variables — but it is still the one place these numbers
 * exist on the site.
 */

export type EasingCurve = readonly [number, number, number, number];

export const EASING = {
  /** The climb: already moving on entry, a long flat arrival. */
  climb: [0.32, 0.02, 0.14, 1],
  /** Light coming up — ease-out-cubic. Fast to establish, slow to finish. */
  fade: [0.215, 0.61, 0.355, 1],
  /** A settle: almost linear, decelerating only at the very end. */
  drift: [0.2, 0.4, 0.2, 1],
  /** The wordmark: decisive, then very quiet. Arrives without a bump. */
  wordmark: [0.16, 1, 0.3, 1],
  /** A withdrawal — ease-in-out-cubic. It has no destination. */
  retire: [0.645, 0.045, 0.355, 1],
} as const satisfies Record<string, EasingCurve>;

export type EasingName = keyof typeof EASING;

/** Milliseconds. The splash's beats. */
export const DURATION = {
  sceneFade: 900,
  sceneDrift: 3100,
  flight: 1700,
  trackRetire: 700,
  wordmark: 700,
  handoff: 350,
  /** The reduced-motion run holds, then cuts. */
  reducedHold: 700,
  reducedHandoff: 300,
} as const;

/** How far text rises into place, in CSS pixels — the wordmark's 14pt. */
export const RISE_PX = 14;

export function cssEasing(name: EasingName): string {
  const [a, b, c, d] = EASING[name];
  return `cubic-bezier(${String(a)}, ${String(b)}, ${String(c)}, ${String(d)})`;
}

/** The control points as GSAP's `CustomEase` wants them: a bare "x1,y1,x2,y2". */
export function gsapEasing(name: EasingName): string {
  return EASING[name].join(",");
}

/**
 * Evaluates a cubic bezier easing at `t` by Newton iteration on the x
 * component, the way CSS does. For the scene, which interpolates camera
 * positions itself rather than through GSAP.
 */
export function evaluate(curve: EasingCurve, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const [x1, y1, x2, y2] = curve;
  const bezier = (p1: number, p2: number, u: number) =>
    3 * p1 * (1 - u) * (1 - u) * u + 3 * p2 * (1 - u) * u * u + u * u * u;
  const slope = (p1: number, p2: number, u: number) =>
    3 * p1 * (1 - u) * (1 - u) +
    6 * (p2 - p1) * (1 - u) * u +
    3 * (1 - p2) * u * u;

  let u = t;
  for (let i = 0; i < 8; i += 1) {
    const x = bezier(x1, x2, u) - t;
    const dx = slope(x1, x2, u);
    if (Math.abs(x) < 1e-6 || dx === 0) break;
    u -= x / dx;
    u = Math.min(1, Math.max(0, u));
  }
  return bezier(y1, y2, u);
}

export function ease(name: EasingName, t: number): number {
  return evaluate(EASING[name], t);
}
