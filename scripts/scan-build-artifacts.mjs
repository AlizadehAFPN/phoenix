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
 * binary is missing is a scanner that is missing. `brew install gitleaks`.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { SERVER_SECRET_KEYS } from "./lib/embedded-secrets.mjs";

const root = process.cwd();
const problems = [];

/* ---------------------------------------------------------------- pass 1 */

const gitleaks = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
if (gitleaks.error) {
  console.error(
    "\nRefused: gitleaks is not installed, so the build output cannot be scanned.\n" +
      "Install it with `brew install gitleaks` and run the build again.\n",
  );
  process.exit(1);
}

const targets = [".next/static", ".next/standalone", ".vercel/output"].filter(
  (dir) => existsSync(join(root, dir)),
);

for (const dir of targets) {
  const result = spawnSync(
    "gitleaks",
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

/* ---------------------------------------------------------------- pass 2 */

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

const secrets = SERVER_SECRET_KEYS.map((key) => [key, process.env[key]]).filter(
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

/* ---------------------------------------------------------------- pass 3 */

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

/* ---------------------------------------------------------------- report */

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
