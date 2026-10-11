"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import {
  DataTexture,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderer,
} from "three";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

import type { Tier } from "@/lib/device/tier";

import manifest from "@/data/textures.generated.json";

/**
 * The globe's textures, loaded in the order the reader can see them.
 *
 * PROGRESSIVE. The 2K base pair is under two megabytes and arrives first, so
 * the planet is there within the hero's rise; the 4K base follows, then the
 * detail tile for the region every close view lands in (full resolution on
 * the top tier, half on the middle one). Each arrival swaps the uniform and
 * asks for a frame once React has committed it; nothing waits for the set.
 *
 * KTX2 with UASTC, transcoded in a worker by the Basis transcoder served from
 * `/basis/` — never a CDN (BRIEF §3). The files are sRGB-tagged, so the
 * loader marks them sRGB and the shader works in linear light.
 */

export interface GlobeTextures {
  readonly day: Texture;
  readonly night: Texture;
  readonly detailDay: Texture;
  readonly detailNight: Texture;
  /** 0 until the detail pair has arrived. */
  readonly detailMix: number;
  readonly detailRect: readonly [number, number, number, number];
}

const LOADER_PATH = "/basis/";

let shared: KTX2Loader | null = null;

function loader(gl: WebGLRenderer): KTX2Loader {
  if (shared === null) {
    shared = new KTX2Loader().setTranscoderPath(LOADER_PATH).detectSupport(gl);
  }
  return shared;
}

function placeholder(r: number, g: number, b: number, a: number): DataTexture {
  const texture = new DataTexture(new Uint8Array([r, g, b, a]), 1, 1);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function prepare(
  texture: Texture,
  maxAnisotropy: number,
  url: string,
): Texture {
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
  if (process.env.NODE_ENV !== "production") {
    const image = texture.image as { width?: number; height?: number };
    console.info(
      `[scene] texture ${url}: ${String(image.width)}×${String(image.height)}, format ${String(texture.format)}, ${String(texture.mipmaps?.length ?? 0)} mips, ${texture.colorSpace}`,
    );
  }
  return texture;
}

export function useGlobeTextures(tier: Exclude<Tier, "none">): GlobeTextures {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const placeholders = useMemo(
    () => ({
      day: placeholder(8, 18, 40, 0),
      night: placeholder(0, 0, 0, 255),
    }),
    [],
  );

  const [day, setDay] = useState<Texture>(placeholders.day);
  const [night, setNight] = useState<Texture>(placeholders.night);
  const [detail, setDetail] = useState<{ day: Texture; night: Texture } | null>(
    null,
  );

  /* A frame after each arrival has been committed, so the frame callback
     sees the new texture rather than the one it closed over. */
  useEffect(() => {
    invalidate();
  }, [day, night, detail, invalidate]);

  useEffect(() => {
    let cancelled = false;
    const ktx2 = loader(gl);
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    const load = (url: string) =>
      ktx2.loadAsync(url).then((t) => prepare(t, maxAnisotropy, url));

    const run = async () => {
      /* 2K first, for everyone. */
      const [day2k, night2k] = await Promise.all([
        load(manifest.base["2048"].day),
        load(manifest.base["2048"].night),
      ]);
      if (cancelled) return;
      setDay(day2k);
      setNight(night2k);

      if (tier === "c") return;

      const [day4k, night4k] = await Promise.all([
        load(manifest.base["4096"].day),
        load(manifest.base["4096"].night),
      ]);
      if (cancelled) return;
      setDay(day4k);
      setNight(night4k);

      const [detailDay, detailNight] = await Promise.all([
        load(tier === "a" ? manifest.detail.dayFull : manifest.detail.dayHalf),
        load(manifest.detail.night),
      ]);
      if (cancelled) return;
      setDetail({ day: detailDay, night: detailNight });
    };

    run().catch((error: unknown) => {
      console.error("[scene] globe textures failed to load", error);
    });

    return () => {
      cancelled = true;
    };
  }, [gl, tier]);

  return {
    day,
    night,
    detailDay: detail?.day ?? placeholders.day,
    detailNight: detail?.night ?? placeholders.night,
    detailMix: detail === null ? 0 : 1,
    detailRect: manifest.detailRect as unknown as readonly [
      number,
      number,
      number,
      number,
    ],
  };
}
