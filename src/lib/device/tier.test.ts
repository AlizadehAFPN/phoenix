import { describe, expect, it } from "vitest";

import { chooseTier, type TierInput } from "./tier";

const mac: TierInput = {
  webgl2: true,
  maxTextureSize: 16384,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  coarsePointer: false,
  viewportWidth: 1440,
  devicePixelRatio: 2,
};

describe("tiers", () => {
  it("gives a desktop with a real GPU the top tier", () => {
    expect(chooseTier(mac)).toBe("a");
  });

  it("gives an iPad Pro the top tier and a smaller iPad the middle one", () => {
    expect(
      chooseTier({
        ...mac,
        coarsePointer: true,
        viewportWidth: 1366,
        deviceMemory: null,
      }),
    ).toBe("a");
    expect(
      chooseTier({
        ...mac,
        coarsePointer: true,
        viewportWidth: 1180,
        deviceMemory: null,
        hardwareConcurrency: 4,
      }),
    ).toBe("b");
  });

  it("never gives a phone the top tier", () => {
    const phone = {
      ...mac,
      coarsePointer: true,
      viewportWidth: 430,
      deviceMemory: null,
      devicePixelRatio: 3,
    };
    expect(chooseTier(phone)).toBe("b");
    expect(chooseTier({ ...phone, hardwareConcurrency: 4 })).toBe("c");
    expect(chooseTier({ ...phone, maxTextureSize: 4096 })).toBe("c");
  });

  it("falls back to the still image without WebGL2", () => {
    expect(chooseTier({ ...mac, webgl2: false })).toBe("none");
  });

  it("drops a desktop with little memory or small textures to the middle tier", () => {
    expect(chooseTier({ ...mac, deviceMemory: 4 })).toBe("b");
    expect(chooseTier({ ...mac, maxTextureSize: 4096 })).toBe("b");
  });
});
