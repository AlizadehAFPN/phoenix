#!/usr/bin/env node
/**
 * Builds the globe's textures from the public-domain sources (BRIEF §4).
 *
 *   assets-src/world.topo.bathy.200409.3x21600x10800.png   NASA Blue Marble
 *       Next Generation, September 2004, with topography and bathymetry.
 *       Visible Earth record 73801. Public domain.
 *   assets-src/BlackMarble_2016_3km.jpg                    NASA Black Marble
 *       2016, 13500×6750. Visible Earth record 144898. Public domain.
 *   assets-src/ne_10m_land.geojson                         Natural Earth
 *       1:10m land polygons. Public domain.
 *
 * TWO LAYERS, NOT ONE BIG MAP. An 8K global map is 25 MB and every close
 * camera view of the page lands inside one region (src/data/detail-region.json),
 * so the globe carries a 4K base map for the far views and a DETAIL TILE cut
 * from the sources at their native resolution for that region only. The
 * shader blends the tile over the base inside the region. Under `public/textures/`:
 *
 *   earth-day-{4096,2048}.ktx2    RGBA: Blue Marble in RGB and the Natural
 *                                 Earth LAND MASK in alpha — one texture
 *                                 carries the colour, the ocean specular and
 *                                 the coastline (drawn from the mask's edge
 *                                 in the shader, crisp at any zoom)
 *   earth-night-{4096,2048}.ktx2  RGB: Black Marble city lights
 *   detail-day-{full,half}.ktx2   the region at native / half resolution
 *   detail-night.ktx2             the region's lights at native resolution
 *
 * All KTX2 with UASTC encoding, mipmaps, rate-distortion optimisation and
 * Zstandard supercompression, through KTX-Software 4.4.2 (`ktx create`).
 * Images are flipped before encoding so row 0 is the south edge: a
 * compressed texture cannot be flipped on upload, and three's sphere puts
 * v = 1 at the north pole. September imagery because the page's date is
 * 2026-09-26 and the snow line should agree with it.
 *
 * `assets-src/` is gitignored; the KTX2 files and the generated manifest are
 * committed, so the site builds anywhere. Re-run only when a source, a tier
 * or the region changes:
 *
 *   npm run textures
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const src = resolve(root, "assets-src");
const work = resolve(root, "assets-src/work");
const out = resolve(root, "public/textures");

const DAY = resolve(src, "world.topo.bathy.200409.3x21600x10800.png");
const NIGHT = resolve(src, "BlackMarble_2016_3km.jpg");
const LAND = resolve(src, "ne_10m_land.geojson");
const REGION = JSON.parse(
  readFileSync(resolve(root, "src/data/detail-region.json"), "utf8"),
);

const DAY_SOURCE = { width: 21600, height: 10800 };
const NIGHT_SOURCE = { width: 13500, height: 6750 };
const BASE_TIERS = [4096, 2048];

for (const file of [DAY, NIGHT, LAND]) {
  if (!existsSync(file)) {
    console.error(
      `missing source: ${file}\nsee the header of this script for where it comes from`,
    );
    process.exit(1);
  }
}
mkdirSync(work, { recursive: true });
mkdirSync(out, { recursive: true });

sharp.cache(false);
sharp.concurrency(0);

/* ------------------------------------------------------------- geometry */

/** Pixel box of a lon/lat region in an equirectangular image of `size`. */
function regionBox(size) {
  const left = Math.round(((REGION.lonMin + 180) / 360) * size.width);
  const right = Math.round(((REGION.lonMax + 180) / 360) * size.width);
  const top = Math.round(((90 - REGION.latMax) / 180) * size.height);
  const bottom = Math.round(((90 - REGION.latMin) / 180) * size.height);
  return { left, top, width: right - left, height: bottom - top };
}

/* ----------------------------------------------------------- land mask */

/** The Natural Earth land polygons as one SVG path in world pixel space. */
function landPath(width, height) {
  const geo = JSON.parse(readFileSync(LAND, "utf8"));
  const parts = [];
  const px = (lon, lat) =>
    `${(((lon + 180) / 360) * width).toFixed(2)},${(((90 - lat) / 180) * height).toFixed(2)}`;
  for (const feature of geo.features) {
    const g = feature.geometry;
    const polygons =
      g.type === "Polygon"
        ? [g.coordinates]
        : g.type === "MultiPolygon"
          ? g.coordinates
          : [];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        if (ring.length < 3) continue;
        let d = `M${px(ring[0][0], ring[0][1])}`;
        for (let i = 1; i < ring.length; i += 1)
          d += `L${px(ring[i][0], ring[i][1])}`;
        parts.push(`${d}Z`);
      }
    }
  }
  return parts.join("");
}

/**
 * Rasterises the land mask for a window of the world. `world` is the full
 * equirectangular size the path is expressed in; `box` is the window to
 * render, at `width` × `height` output pixels. Even-odd fill so interior
 * rings cut holes; librsvg antialiases the coast.
 */
async function landMask(world, box, width, height) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" ` +
    `viewBox="${String(box.left)} ${String(box.top)} ${String(box.width)} ${String(box.height)}">` +
    `<rect x="${String(box.left)}" y="${String(box.top)}" width="${String(box.width)}" height="${String(box.height)}" fill="black"/>` +
    `<path d="${landPath(world.width, world.height)}" fill="white" fill-rule="evenodd"/></svg>`;
  return sharp(Buffer.from(svg), { limitInputPixels: false })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/* ------------------------------------------------------------------ ktx */

function ktxCreate(input, output, { alpha, rdo }) {
  const args = [
    "create",
    "--format",
    alpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB",
    "--assign-tf",
    "srgb",
    "--generate-mipmap",
    "--encode",
    "uastc",
    "--uastc-quality",
    "2",
    "--uastc-rdo",
    "--uastc-rdo-l",
    String(rdo),
    "--zstd",
    "18",
    input,
    output,
  ];
  const result = spawnSync("ktx", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(
      `ktx create failed for ${output} (exit ${String(result.status)})`,
    );
  }
}

/**
 * Composes RGB + mask into a flipped RGBA PNG for `ktx create`.
 *
 * NEVER RESIZE THE RESULT. libvips premultiplies by alpha before it resamples
 * and divides it back out after, and where alpha is 0 — every ocean texel,
 * since the alpha is the LAND mask — that division leaves the colour black.
 * Each size is composed from its own RGB and its own mask instead, and the
 * water is checked before the file is written.
 */
async function composeDay(rgb, mask, width, height, file) {
  assertWaterIsNotBlack(rgb, mask, file);
  await sharp(rgb, { raw: { width, height, channels: 3 } })
    .joinChannel(mask, { raw: { width, height, channels: 1 } })
    .flip()
    .png({ compressionLevel: 6 })
    .toFile(file);
}

/**
 * The ocean's mean colour must look like an ocean. Blue Marble's open water
 * averages around 60–90 per channel; a run that blacks it out averages 0.
 * A threshold of 20 catches the failure without being sensitive to imagery.
 */
function assertWaterIsNotBlack(rgb, mask, label) {
  let n = 0;
  let sum = 0;
  for (let i = 0; i < mask.length; i += 11) {
    if (mask[i] !== 0) continue;
    n += 1;
    sum += rgb[i * 3] + rgb[i * 3 + 1] + rgb[i * 3 + 2];
  }
  const mean = n === 0 ? 0 : sum / (n * 3);
  if (n > 0 && mean < 20) {
    throw new Error(
      `${label}: ocean texels average ${mean.toFixed(1)} — the water has been blacked out`,
    );
  }
}

/* ------------------------------------------------------------------ run */

async function main() {
  const started = Date.now();
  const world = { width: BASE_TIERS[0], height: BASE_TIERS[0] / 2 };

  /* ---- base maps ------------------------------------------------------- */

  console.log(
    `base day: ${String(world.width)}×${String(world.height)} from the 21600×10800 source`,
  );
  const dayBase = await sharp(DAY, { limitInputPixels: false })
    .resize(world.width, world.height, { kernel: "lanczos3", fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  console.log("base land mask from Natural Earth 10m");
  const maskBase = await landMask(
    world,
    { left: 0, top: 0, ...world },
    world.width,
    world.height,
  );
  const dayBasePng = resolve(work, `earth-day-${String(world.width)}.png`);
  await composeDay(
    dayBase,
    maskBase.data,
    world.width,
    world.height,
    dayBasePng,
  );

  console.log(
    `base night: ${String(world.width)}×${String(world.height)} from the 13500×6750 source`,
  );
  const nightBasePng = resolve(work, `earth-night-${String(world.width)}.png`);
  await sharp(NIGHT, { limitInputPixels: false })
    .resize(world.width, world.height, { kernel: "lanczos3", fit: "fill" })
    .removeAlpha()
    .flip()
    .png({ compressionLevel: 6 })
    .toFile(nightBasePng);

  for (const width of BASE_TIERS) {
    const dayPng =
      width === world.width
        ? dayBasePng
        : resolve(work, `earth-day-${String(width)}.png`);
    const nightPng =
      width === world.width
        ? nightBasePng
        : resolve(work, `earth-night-${String(width)}.png`);
    if (width !== world.width) {
      /* The RGB is resized on its own (no alpha, nothing premultiplied) and
         the land mask is rasterised again at this size: see composeDay. */
      const size = { width, height: width / 2 };
      const rgb = await sharp(dayBase, {
        raw: { width: world.width, height: world.height, channels: 3 },
      })
        .resize(size.width, size.height, { kernel: "lanczos3", fit: "fill" })
        .raw()
        .toBuffer();
      const mask = await landMask(
        world,
        { left: 0, top: 0, ...world },
        size.width,
        size.height,
      );
      await composeDay(rgb, mask.data, size.width, size.height, dayPng);
      await sharp(nightBasePng, { limitInputPixels: false })
        .resize(width, width / 2, { kernel: "lanczos3", fit: "fill" })
        .png({ compressionLevel: 6 })
        .toFile(nightPng);
    }
    console.log(`ktx: base day ${String(width)}`);
    ktxCreate(dayPng, resolve(out, `earth-day-${String(width)}.ktx2`), {
      alpha: true,
      rdo: 0.5,
    });
    console.log(`ktx: base night ${String(width)}`);
    ktxCreate(nightPng, resolve(out, `earth-night-${String(width)}.ktx2`), {
      alpha: false,
      rdo: 1.0,
    });
  }

  /* ---- detail tiles ---------------------------------------------------- */

  const dayBox = regionBox(DAY_SOURCE);
  console.log(
    `detail day: ${String(dayBox.width)}×${String(dayBox.height)} at native resolution`,
  );
  const dayDetail = await sharp(DAY, { limitInputPixels: false })
    .extract(dayBox)
    .removeAlpha()
    .raw()
    .toBuffer();
  const maskDetail = await landMask(
    DAY_SOURCE,
    dayBox,
    dayBox.width,
    dayBox.height,
  );
  const detailFullPng = resolve(work, "detail-day-full.png");
  await composeDay(
    dayDetail,
    maskDetail.data,
    dayBox.width,
    dayBox.height,
    detailFullPng,
  );
  const detailHalfPng = resolve(work, "detail-day-half.png");
  const half = {
    width: Math.round(dayBox.width / 2),
    height: Math.round(dayBox.height / 2),
  };
  const halfRgb = await sharp(dayDetail, {
    raw: { width: dayBox.width, height: dayBox.height, channels: 3 },
  })
    .resize(half.width, half.height, { kernel: "lanczos3", fit: "fill" })
    .raw()
    .toBuffer();
  const halfMask = await landMask(DAY_SOURCE, dayBox, half.width, half.height);
  await composeDay(
    halfRgb,
    halfMask.data,
    half.width,
    half.height,
    detailHalfPng,
  );

  const nightBox = regionBox(NIGHT_SOURCE);
  /* UASTC wants multiples of four; the night tile is resampled to the
     nearest such size (a few pixels at most). */
  const nightSize = {
    width: Math.round(nightBox.width / 4) * 4,
    height: Math.round(nightBox.height / 4) * 4,
  };
  console.log(
    `detail night: ${String(nightBox.width)}×${String(nightBox.height)} at native resolution → ${String(nightSize.width)}×${String(nightSize.height)}`,
  );
  const detailNightPng = resolve(work, "detail-night.png");
  await sharp(NIGHT, { limitInputPixels: false })
    .extract(nightBox)
    .resize(nightSize.width, nightSize.height, {
      kernel: "lanczos3",
      fit: "fill",
    })
    .removeAlpha()
    .flip()
    .png({ compressionLevel: 6 })
    .toFile(detailNightPng);

  console.log("ktx: detail day full");
  ktxCreate(detailFullPng, resolve(out, "detail-day-full.ktx2"), {
    alpha: true,
    rdo: 0.5,
  });
  console.log("ktx: detail day half");
  ktxCreate(detailHalfPng, resolve(out, "detail-day-half.ktx2"), {
    alpha: true,
    rdo: 0.5,
  });
  console.log("ktx: detail night");
  ktxCreate(detailNightPng, resolve(out, "detail-night.ktx2"), {
    alpha: false,
    rdo: 1.0,
  });

  /* ---- manifest -------------------------------------------------------- */

  const manifest = {
    comment: "GENERATED by scripts/textures/build.mjs. Do not edit.",
    region: {
      lonMin: REGION.lonMin,
      lonMax: REGION.lonMax,
      latMin: REGION.latMin,
      latMax: REGION.latMax,
    },
    /* The region in the globe's UV space: u east from −180°, v north from −90°. */
    detailRect: [
      (REGION.lonMin + 180) / 360,
      (REGION.latMin + 90) / 180,
      (REGION.lonMax + 180) / 360,
      (REGION.latMax + 90) / 180,
    ],
    base: {
      4096: {
        day: "/textures/earth-day-4096.ktx2",
        night: "/textures/earth-night-4096.ktx2",
      },
      2048: {
        day: "/textures/earth-day-2048.ktx2",
        night: "/textures/earth-night-2048.ktx2",
      },
    },
    detail: {
      dayFull: "/textures/detail-day-full.ktx2",
      dayHalf: "/textures/detail-day-half.ktx2",
      night: "/textures/detail-night.ktx2",
      size: {
        day: [dayBox.width, dayBox.height],
        night: [nightSize.width, nightSize.height],
      },
    },
  };
  writeFileSync(
    resolve(root, "src/data/textures.generated.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  writeFileSync(
    resolve(out, "SOURCES.md"),
    [
      "# Texture sources",
      "",
      "Built by `scripts/textures/build.mjs`. All sources are public domain.",
      "",
      "- `earth-day-*.ktx2`, `detail-day-*.ktx2`: NASA Blue Marble Next Generation, September 2004,",
      "  with topography and bathymetry (Visible Earth record 73801,",
      "  `world.topo.bathy.200409.3x21600x10800.png`), NASA Earth Observatory. The alpha channel is a",
      "  land mask rasterised from Natural Earth 1:10m land polygons (naturalearthdata.com).",
      "- `earth-night-*.ktx2`, `detail-night.ktx2`: NASA Black Marble 2016 (Visible Earth record",
      "  144898, `BlackMarble_2016_3km.jpg`), NASA Earth Observatory.",
      "",
      'Credit line on the page: "Earth imagery: NASA Earth Observatory (Blue Marble, Black Marble).',
      'Coastlines: Natural Earth." No NASA logo is used and no endorsement is implied.',
      "",
    ].join("\n"),
  );

  console.log(`done in ${String(Math.round((Date.now() - started) / 1000))} s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
