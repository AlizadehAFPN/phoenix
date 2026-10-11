/**
 * The cloud layer, baked.
 *
 * Evaluating four octaves of noise, twice, for every pixel of a Retina
 * frame costs more than the whole rest of the scene. So the clouds are
 * rendered ONCE into an equirectangular texture — a fullscreen pass over a
 * 4096×2048 target, twice a second while they drift — and the globe's own
 * shader then reads two texels: the cover under the fragment and the cover
 * a little up-sun of it, for the shadow.
 */

export const CLOUDS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const CLOUDS_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  varying vec2 vUv;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 4.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    /* The texel's direction on the sphere, in the globe's frame (see geo.ts):
       u east from -180°, v north from -90°. */
    float lon = (vUv.x - 0.5) * 6.2831853;
    float lat = (vUv.y - 0.5) * 3.1415927;
    vec3 n = vec3(cos(lat) * cos(lon), sin(lat), -cos(lat) * sin(lon));

    vec3 p = n * 16.0 + vec3(uTime * 0.004, 0.0, uTime * 0.003);
    float c = fbm(p + 0.35 * fbm(p * 1.7));
    float cover = smoothstep(0.56, 0.78, c);
    gl_FragColor = vec4(cover, cover, cover, 1.0);
  }
`;
