import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  classify,
  findEmbeddedSecrets,
  resolveValue,
} from "./embedded-secrets.mjs";

describe("classify", () => {
  it("accepts the allow-listed public identifiers", () => {
    expect(classify("NEXT_PUBLIC_SITE_URL", "https://example.test")).toBeNull();
    expect(
      classify("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x4AAAAAAAexample"),
    ).toBeNull();
    expect(classify("NEXT_PUBLIC_SITE_THEME", "generic")).toBeNull();
  });

  it("accepts the platform's own NEXT_PUBLIC_VERCEL_ system variables", () => {
    expect(
      classify("NEXT_PUBLIC_VERCEL_URL", "phoenix-abc123.vercel.app"),
    ).toBeNull();
    expect(
      classify(
        "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
        "6227679249e98ef882cf9c8562e0e74cb6d356be",
      ),
    ).toBeNull();
    expect(classify("NEXT_PUBLIC_VERCEL_TARGET_ENV", "production")).toBeNull();
  });

  it("refuses any other NEXT_PUBLIC_ key that carries a value", () => {
    expect(classify("NEXT_PUBLIC_MAP_KEY", "abc")).toMatch(
      /not on the allow-list/,
    );
    expect(
      classify("NEXT_PUBLIC_RESEND_API_KEY", "re_" + "x".repeat(24)),
    ).toMatch(/not on the allow-list/);
  });

  it("refuses a credential-shaped value even under an allowed key", () => {
    expect(classify("NEXT_PUBLIC_SITE_URL", "AKIAIOSFODNN7EXAMPLE")).toMatch(
      /AWS access key id/,
    );
    expect(classify("NEXT_PUBLIC_VERCEL_URL", "re_" + "a".repeat(24))).toMatch(
      /Resend API key/,
    );
  });

  it("ignores empty values and server-side keys", () => {
    expect(classify("NEXT_PUBLIC_MAP_KEY", "")).toBeNull();
    expect(classify("RESEND_API_KEY", "re_" + "a".repeat(24))).toBeNull();
  });
});

describe("resolveValue", () => {
  it("resolves quotes and comments the way a dotenv parser does", () => {
    expect(resolveValue('""')).toBe("");
    expect(resolveValue("''")).toBe("");
    expect(resolveValue("   # not yet")).toBe("");
    expect(resolveValue("abc # trailing")).toBe("abc");
    expect(resolveValue('"a # b"')).toBe("a # b");
  });
});

describe("findEmbeddedSecrets", () => {
  let dir = "";
  afterEach(() => {
    if (dir !== "") rmSync(dir, { recursive: true, force: true });
  });

  it("reports the file, the line and the length, never the value", () => {
    dir = mkdtempSync(join(tmpdir(), "phoenix-guard-"));
    writeFileSync(
      join(dir, ".env.local"),
      [
        "NEXT_PUBLIC_SITE_URL=https://example.test",
        "export NEXT_PUBLIC_SECRET=abcdefghij",
        "RESEND_API_KEY=re_" + "k".repeat(24),
      ].join("\n"),
    );
    const findings = findEmbeddedSecrets(dir, {});
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      where: ".env.local:2",
      key: "NEXT_PUBLIC_SECRET",
      length: 10,
    });
    expect(JSON.stringify(findings)).not.toContain("abcdefghij");
  });

  it("checks the inherited environment too", () => {
    dir = mkdtempSync(join(tmpdir(), "phoenix-guard-"));
    const findings = findEmbeddedSecrets(dir, {
      NEXT_PUBLIC_OOPS: "value",
      NEXT_PUBLIC_VERCEL_ENV: "preview",
    });
    expect(findings.map((f) => f.key)).toEqual(["NEXT_PUBLIC_OOPS"]);
  });
});
