"use client";

import { useMemo } from "react";
import { BlendFunction, Effect } from "postprocessing";

/**
 * The first pass of the composer: any pixel that is not a number — or is
 * infinite, or negative — becomes black, right there, before the bloom's
 * mipmap chain can smear it into a square the size of a hand.
 *
 * A single NaN texel in a half-float buffer reads as black after the
 * thirteen-tap downsample and the tent upsample have spread it across five
 * levels: on screen, a crisp dark block two to three hundred pixels wide
 * that appears and vanishes as the offending fragment comes and goes. The
 * scene's own shaders are written to never produce one, and this is the
 * guarantee that holds if a driver's `pow` or `atan` disagrees.
 */
const FRAGMENT = /* glsl */ `
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 c = inputColor;
    if (any(isnan(c)) || any(isinf(c))) {
      c = vec4(0.0, 0.0, 0.0, 1.0);
    }
    outputColor = clamp(c, vec4(0.0), vec4(16.0, 16.0, 16.0, 1.0));
  }
`;

class SanitizeEffect extends Effect {
  constructor() {
    super("SanitizeEffect", FRAGMENT, { blendFunction: BlendFunction.SET });
  }
}

export function Sanitize() {
  const effect = useMemo(() => new SanitizeEffect(), []);
  return <primitive object={effect} />;
}
