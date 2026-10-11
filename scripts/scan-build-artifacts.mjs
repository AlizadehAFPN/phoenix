#!/usr/bin/env node
/**
 * Scans what `next build` produced for anything that must not ship.
 *
 * Runs last in the `build` npm script. A build is reported clean only after
 * this has run (BRIEF §2.3): the pre-build check reasons about inputs, this one
 * looks at the artefact, and only the artefact can prove the point.
 *
 * Three passes:
 *
 * 1. `gitleaks dir` over the client chunks, the standalone output and the
 *    Vercel build output, with the repo's `.gitleaks.toml`. Values are redacted
 *    in its report.
 * 2. An exact search for the VALUE of every server secret present in this
 *    process's environment, across the whole `.next` tree. Next does not inline
 *    those, and this is how that stays a fact rather than an assumption.
 * 3. A check that the standalone output carries no `.env*` file. Next copies
 *    them in (next.js issue #46296), and a Docker image built from that folder
 *    would ship them.
 *
 * gitleaks is REQUIRED, not optional: a scanner that silently skips when its
 * binary is missing is a scanner that is missing. On a machine without it
 * (a Vercel build container, a CI runner) the pinned release is downloaded
 * from the project's GitHub releases and its SHA-256 checked against the
 * sums recorded below before it runs; if that fails, the build fails.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

import { SERVER_SECRET_KEYS } from "./lib/embedded-secrets.mjs";

const root = process.cwd();

/* ------------------------------------------------------------ gitleaks */

const GITLEAKS_VERSION = "8.30.1";

/** SHA-256 of each release tarball, from the release's own checksums file. */
const GITLEAKS_SHA256 = {
  "linux-x64":
    "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
  "linux-arm64":
    "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080",
  "darwin-arm64":
    "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
  "darwin-x64":
    "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709",
};

function refuse(message) {
  console.error(`\nRefused: ${message}\n`);
  process.exit(1);
}

/** The gitleaks executable: the one on PATH, or the pinned release. */
async function resolveGitleaks() {
  const onPath = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
  if (!onPath.error && onPath.status === 0) return "gitleaks";

  const platform =
    process.platform === "darwin"
      ? "darwin"
      : process.platform === "linux"
        ? "linux"
        : null;
  const arch =
    process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : null;
  const key = platform !== null && arch !== null ? `${platform}-${arch}` : null;
  const expected = key === null ? undefined : GITLEAKS_SHA256[key];
  if (expected === undefined) {
    refuse(
      `gitleaks is not installed and there is no pinned release for ${process.platform}/${process.arch}.\n` +
        "Install it (`brew install gitleaks`) and run the build again.",
    );
  }

  const dir = join(
    root,
    "node_modules",
    ".cache",
    "gitleaks",
    GITLEAKS_VERSION,
  );
  const binary = join(dir, "gitleaks");
  if (existsSync(binary)) return binary;

  const asset = `gitleaks_${GITLEAKS_VERSION}_${platform}_${arch}.tar.gz`;
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${asset}`;
  console.log(
    `gitleaks is not installed; fetching the pinned release ${GITLEAKS_VERSION} (${asset})`,
  );

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok)
    refuse(
      `could not download gitleaks (${String(response.status)} from ${url}).`,
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) {
    refuse(
      `the downloaded gitleaks tarball does not match its pinned checksum (${asset}).`,
    );
  }

  mkdirSync(dir, { recursive: true });
  const tarball = join(dir, asset);
  writeFileSync(tarball, bytes);
  const extracted = spawnSync("tar", ["-xzf", tarball, "-C", dir, "gitleaks"], {
    encoding: "utf8",
  });
  if (extracted.status !== 0 || !existsSync(binary)) {
    refuse(`could not extract gitleaks:\n${extracted.stderr}`);
  }
  chmodSync(binary, 0o755);
  return binary;
}

/* ---------------------------------------------------------------- walk */

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (entry === "cache" || entry === "node_modules") continue;
      yield* walk(path);
    } else if (stats.isFile()) {
      yield path;
    }
  }
}

/* ------------------------------------------------------------------ main */

async function main() {
  const problems = [];
  const gitleaks = await resolveGitleaks();

  /* ---- pass 1 ---------------------------------------------------------- */

  const targets = [".next/static", ".next/standalone", ".vercel/output"].filter(
    (dir) => existsSync(join(root, dir)),
  );

  for (const dir of targets) {
    const result = spawnSync(
      gitleaks,
      [
        "dir",
        dir,
        "--config",
        ".gitleaks.toml",
        "--redact",
        "--no-banner",
        "--exit-code",
        "2",
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (result.status === 2) {
      problems.push(
        `gitleaks found a secret under ${dir}:\n${result.stdout}${result.stderr}`,
      );
    } else if (result.status !== 0) {
      problems.push(
        `gitleaks failed on ${dir} (exit ${String(result.status)}):\n${result.stderr}`,
      );
    }
  }

  /* ---- pass 2 ---------------------------------------------------------- */

  const secrets = SERVER_SECRET_KEYS.map((key) => [
    key,
    process.env[key],
  ]).filter(
    ([, value]) => typeof value === "string" && value.trim().length >= 8,
  );

  let files = 0;
  let bytes = 0;
  if (existsSync(join(root, ".next"))) {
    for (const file of walk(join(root, ".next"))) {
      const content = readFileSync(file);
      files += 1;
      bytes += content.length;
      for (const [key, value] of secrets) {
        if (content.includes(value.trim())) {
          problems.push(
            `the value of ${key} (${String(value.trim().length)} chars) is inside ${relative(root, file)}`,
          );
        }
      }
    }
  }

  /* ---- pass 3 ---------------------------------------------------------- */

  const standalone = join(root, ".next/standalone");
  if (existsSync(standalone)) {
    for (const entry of readdirSync(standalone)) {
      if (entry.startsWith(".env")) {
        problems.push(
          `.next/standalone/${entry} exists; a Docker image built from it would ship it`,
        );
      }
    }
  }

  /* ---- report ---------------------------------------------------------- */

  if (problems.length > 0) {
    console.error("\nRefused: the build output is not clean.\n");
    for (const problem of problems) console.error(`  - ${problem}\n`);
    process.exit(1);
  }

  console.log(
    `Build output scanned: ${targets.join(", ") || "(nothing to scan)"}; ` +
      `${String(files)} files, ${String(bytes)} bytes under .next; ` +
      `${String(secrets.length)} server secret value(s) searched for; none found.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
