#!/usr/bin/env node
/**
 * Refuses to start a build while a credential sits where Next would inline it.
 *
 * The scan, and the reasoning behind it, are in `./lib/embedded-secrets.mjs`.
 * This file is only the command: it runs first in the `build` npm script so
 * the common case fails in a second with a readable message, rather than
 * after a full compile.
 *
 * IT IS NOT THE LAST LOCK. `scripts/scan-build-artifacts.mjs` runs after
 * `next build` and scans the output itself, which is the only place the
 * guarantee can actually be verified rather than assumed.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  describeFindings,
  findEmbeddedSecrets,
} from "./lib/embedded-secrets.mjs";

const root = process.cwd();
const findings = findEmbeddedSecrets(root);

/* The `env` key in next.config inlines every value it names into the bundle
   regardless of prefix, which is how phoenix-frontend leaks (BRIEF §9). It is
   simply never used here, and a build that reintroduces it stops at this line. */
for (const name of ["next.config.ts", "next.config.mjs", "next.config.js"]) {
  const path = join(root, name);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  if (/^\s*env\s*:/m.test(source)) {
    findings.push({
      where: name,
      key: "env",
      length: 0,
      reason:
        "the `env` config key inlines every value it names into the bundle",
    });
  }
}

if (findings.length > 0) {
  console.error(describeFindings(findings));
  process.exit(1);
}

console.log("No credential in the build environment.");
