/**
 * The globe's surface.
 *
 * One material does the whole planet: the day map lit by the real sun, the
 * city lights where the sun is down, a warm band at the terminator, the
 * ocean's highlight, the coastline drawn from the land mask's edge, clouds
 * on the top tier, and the sky's colour at grazing angles. The detail tile
 * is blended over the base map inside its rectangle.
 *
 * THE COLOURS IN HERE ARE PHYSICS, NOT DESIGN. The sky blue and the twilight
 * orange are the colours Rayleigh scattering produces (blue light scatters
 * about five times more than red), stated as the usual approximations rather
 * than computed per pixel. Nothing here is a brand value; those come in as
 * uniforms from the token layer (the coastline and the line).
 *
 * Textures are sRGB-tagged KTX2 files, so sampling returns linear values and
 * the arithmetic is linear throughout; three's own chunks encode the output.
 */

export const GLOBE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const GLOBE_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uDetailDay;
  uniform sampler2D uDetailNight;
  uniform vec4 uDetailRect;
  uniform float uDetailMix;
  uniform vec3 uSunDir;
  uniform vec3 uCameraPos;
  uniform sampler2D uCloudMap;
  uniform float uClouds;
  uniform vec3 uCoastColor;
  uniform float uCoastAlpha;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  /* Rayleigh sky and twilight, see the module comment. */
  const vec3 SKY = vec3(0.30, 0.55, 1.0);
  const vec3 TWILIGHT = vec3(1.0, 0.42, 0.12);

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunDir);
    float NdotL = dot(N, L);

    /* Base map, and the detail tile inside its rectangle with a soft edge. */
    vec4 base = texture2D(uDay, vUv);
    vec3 night = texture2D(uNight, vUv).rgb;
    vec2 d = (vUv - uDetailRect.xy) / (uDetailRect.zw - uDetailRect.xy);
    float inside = step(0.0, d.x) * step(d.x, 1.0) * step(0.0, d.y) * step(d.y, 1.0);
    float border = smoothstep(0.0, 0.08, min(min(d.x, 1.0 - d.x), min(d.y, 1.0 - d.y)));
    float detailW = uDetailMix * inside * border;
    vec2 dUv = clamp(d, 0.0, 1.0);
    vec4 detail = texture2D(uDetailDay, dUv);
    vec3 detailNight = texture2D(uDetailNight, dUv).rgb;
    vec3 albedo = mix(base.rgb, detail.rgb, detailW);
    float land = mix(base.a, detail.a, detailW);
    night = mix(night, detailNight, detailW);

    /* Sunlight, with a soft terminator and a warm band across it. */
    float daylight = smoothstep(-0.10, 0.30, NdotL);
    float twilight = exp(-pow(NdotL / 0.14, 2.0));
    vec3 warm = mix(vec3(1.0), TWILIGHT / TWILIGHT.r, twilight * 0.85);
    /* By day the surface stays at or below 1.0, so it never blooms; the
       night side keeps a trace of earthshine so the continents are there. */
    vec3 color = albedo * (daylight * 1.5 * warm + 0.03) + SKY * 0.012 * (1.0 - daylight);

    /* The sun on the water. */
    float water = 1.0 - land;
    vec3 H = normalize(L + V);
    float highlight = pow(max(dot(N, H), 0.0), 120.0) * water * daylight;
    color += highlight * vec3(1.0, 0.95, 0.85) * 1.1;

    /* Clouds, on the top tier, from the baked map (shaders/clouds.ts): lit
       like the ground, with a faint shadow a little up-sun of each cloud so
       they sit above it. */
    if (uClouds > 0.5) {
      float cover = texture2D(uCloudMap, vUv).r * 0.55;
      vec2 sunUv = vec2(L.x, L.y) * 0.004;
      float shadow = texture2D(uCloudMap, vUv - sunUv).r;
      color *= 1.0 - shadow * 0.18 * daylight;
      color = mix(color, (daylight * 0.98 + 0.02) * warm, cover);
    }

    /* City lights where the sun is down. */
    /* City lights, written above 1.0 on purpose: they are what blooms. */
    float nightW = 1.0 - smoothstep(-0.18, 0.06, NdotL);
    color += night * nightW * 2.8;

    /* The coastline: the 0.5 isoline of the land mask, one to two pixels wide
       at any zoom, stronger on the night side where there is nothing else to
       outline the land. */
    float w = max(fwidth(land), 1e-4);
    float coast = 1.0 - smoothstep(0.6 * w, 1.6 * w, abs(land - 0.5));
    /* Not across the tile's border, where the two masks cross-fade and the
       0.5 isoline would draw the rectangle itself. */
    coast *= 1.0 - 4.0 * detailW * (1.0 - detailW);
    color = mix(color, uCoastColor, coast * uCoastAlpha * mix(0.12, 1.0, nightW));

    /* The sky, seen through more air at grazing angles. */
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);
    color += SKY * fresnel * (0.55 * daylight + 0.15 * twilight);
    color += TWILIGHT * fresnel * twilight * 0.6;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

/**
 * The atmosphere's rim: a slightly larger sphere drawn from the inside, so
 * only the part outside the planet's silhouette survives the depth test. It
 * glows blue where the sun is up and orange in a band at the terminator,
 * and fades with distance from the limb.
 */
export const ATMOSPHERE_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3 uSunDir;
  uniform vec3 uCameraPos;
  uniform float uRimPower;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  const vec3 SKY = vec3(0.30, 0.55, 1.0);
  const vec3 TWILIGHT = vec3(1.0, 0.42, 0.12);

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunDir);
    float rim = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), uRimPower);
    float facing = dot(N, L);
    float lit = smoothstep(-0.30, 0.35, facing);
    float twilight = exp(-pow(facing / 0.20, 2.0));
    vec3 color = SKY * lit * 0.9 + TWILIGHT * twilight * 0.9;
    float intensity = rim * (0.9 * lit + 0.7 * twilight) * uIntensity;
    gl_FragColor = vec4(color * intensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * The hold-to-confirm ring on the globe, drawn as an arc that fills
 * clockwise: a flat disc whose fragment keeps only a thin annulus and only
 * the angles below the fill.
 */
export const RING_VERTEX = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const RING_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uFill;
  uniform float uOuter;
  uniform float uInner;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vLocal;

  void main() {
    float r = length(vLocal);
    float band = smoothstep(uInner - 0.0008, uInner, r) * (1.0 - smoothstep(uOuter, uOuter + 0.0008, r));
    float angle = atan(vLocal.x, vLocal.y);
    float turn = (angle < 0.0 ? angle + 6.2831853 : angle) / 6.2831853;
    float filled = step(turn, uFill);
    float track = 0.22;
    float a = band * mix(track, 1.0, filled) * uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;
