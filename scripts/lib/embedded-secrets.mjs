/**
 * Finds a credential that a production bundle would compile in.
 *
 * ---
 *
 * THE MECHANISM IT GUARDS AGAINST. Next.js inlines every `process.env.NEXT_PUBLIC_X`
 * it can see into the VALUE at build time, in plain text, into the client
 * chunks under `.next/static`. It does this whether or not the page reads the
 * value in a branch that ever runs, and it reads the value from every env file
 * it loads as well as from the shell. So the question is never "does the site
 * use this key" — it is "is this key present in a build input".
 *
 * The site's rule (BRIEF §2.3) is therefore an ALLOW-LIST: the only
 * `NEXT_PUBLIC_` keys that may carry a value are the public identifiers named
 * below. Any other `NEXT_PUBLIC_` key with a value refuses the build, because
 * a key nobody has consciously classified as public is exactly the shape a
 * leak takes. Server secrets never carry the prefix at all.
 *
 * ---
 *
 * TWO CALLERS, DELIBERATELY:
 *
 * - `scripts/check-release-secrets.mjs` runs first in the `build` npm script,
 *   so the common case fails in a second with a readable message rather than
 *   after a full compile.
 * - `scripts/scan-build-artifacts.mjs` runs after `next build` and scans the
 *   OUTPUT, which is the only place the guarantee can actually be verified.
 *
 * Ported from the Phoenix app's `scripts/embedded-secrets.cjs` and adapted to
 * Next's env model. The value of a finding is NEVER returned or printed; the
 * location, the key and the length are all anyone needs to find it.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The only `NEXT_PUBLIC_` keys that may carry a value. All public identifiers. */
export const PUBLIC_ALLOW_LIST = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_SITE_THEME",
];

/**
 * Server-only secrets. Read in `server-only` modules, entered by the owner as
 * Vercel Sensitive variables, and in local development kept in `.env.local`,
 * which is gitignored. Listed here so the post-build scan knows which values
 * to look for in the output, and so a `NEXT_PUBLIC_` spelling of any of them
 * is refused by name as well as by the allow-list.
 */
export const SERVER_SECRET_KEYS = ["RESEND_API_KEY", "TURNSTILE_SECRET_KEY"];

/**
 * Shapes that are a credential whatever the key is called. A public key that
 * holds one of these has been given the wrong value, which is the one mistake
 * the allow-list cannot catch on its own.
 */
const CREDENTIAL_SHAPES = [
  {
    name: "AWS access key id",
    pattern: /\b(AKIA|ASIA|AIDA|AROA|ANPA)[A-Z0-9]{16}\b/,
  },
  { name: "Resend API key", pattern: /\bre_[A-Za-z0-9_]{16,}\b/ },
  {
    name: "Stripe-style secret",
    pattern: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}\b/,
  },
  {
    name: "JSON Web Token",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  },
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

/**
 * Every file Next may load into the build's environment, in Next's own
 * precedence order. BOTH MODES, not just production: a shell that exports
 * `NODE_ENV=development` makes a build read the `.development` files, and the
 * inlining does not care which mode the value came from.
 */
export const ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];

/**
 * What a line's value actually resolves to, the way a dotenv parser resolves
 * it. Only the cases that decide EMPTY versus NOT EMPTY are implemented,
 * because that is the only question here: `KEY=""`, `KEY=''` and
 * `KEY=   # not yet` all resolve to the empty string, and a guard that called
 * those a leak would refuse a clean build and teach people to bypass it.
 */
export function resolveValue(raw) {
  const trimmed = raw.trim();
  if (trimmed === "") return "";

  const quote = trimmed[0];
  if (quote === '"' || quote === "'" || quote === "`") {
    const end = trimmed.indexOf(quote, 1);
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }

  /* An unquoted value ends at a `#`. Only the unquoted case — inside quotes a
     `#` is part of the value. */
  const comment = trimmed.indexOf("#");
  return (comment === -1 ? trimmed : trimmed.slice(0, comment)).trim();
}

/** Parses one env file into `[key, value, lineNumber]` triples. */
function parseEnvFile(text) {
  const entries = [];
  text.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    /* `export KEY=value` is a real assignment to every parser and every
       shell. Reading the key as `export KEY` is how a secret guard produces a
       false negative, which is the one failure mode it cannot have. */
    const key = trimmed
      .slice(0, separator)
      .trim()
      .replace(/^export\s+/, "");
    const value = resolveValue(trimmed.slice(separator + 1));
    entries.push([key, value, index + 1]);
  });
  return entries;
}

/**
 * Classifies one key/value pair. Returns a reason string when the pair must
 * not reach a build, or `null` when it is fine.
 */
export function classify(key, value) {
  if (value === "") return null;

  const isPublic = key.startsWith("NEXT_PUBLIC_");

  if (isPublic && !PUBLIC_ALLOW_LIST.includes(key)) {
    return "a NEXT_PUBLIC_ key that is not on the allow-list";
  }

  if (isPublic) {
    for (const shape of CREDENTIAL_SHAPES) {
      if (shape.pattern.test(value)) {
        return `a public key holding a value shaped like ${shape.name}`;
      }
    }
    for (const secret of SERVER_SECRET_KEYS) {
      if (key.endsWith(secret)) {
        return "a server secret spelled with the NEXT_PUBLIC_ prefix";
      }
    }
  }

  return null;
}

/**
 * Finds every pair that must not reach a build, in the env files and in the
 * environment this process inherited.
 *
 * Returns a list of `{ where, key, length, reason }`. THE VALUE IS NEVER
 * RETURNED — a guard that hands its caller the secret it found has moved the
 * secret somewhere new.
 */
export function findEmbeddedSecrets(root, env = process.env) {
  const findings = [];

  for (const file of ENV_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) continue;

    for (const [key, value, line] of parseEnvFile(readFileSync(path, "utf8"))) {
      const reason = classify(key, value);
      if (reason === null) continue;
      findings.push({
        where: `${file}:${String(line)}`,
        key,
        length: value.length,
        reason,
      });
    }
  }

  /* The environment a CI job or a shell export supplies reaches the bundle by
     exactly the same route a file does. */
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string") continue;
    const reason = classify(key, value.trim());
    if (reason === null) continue;
    findings.push({
      where: "(shell environment)",
      key,
      length: value.trim().length,
      reason,
    });
  }

  return findings;
}

/** The message both callers print. Location and length only; never a value. */
export function describeFindings(findings) {
  return [
    "",
    "Refused: a credential would be compiled into this build.",
    "",
    ...findings.map(
      (f) =>
        `  ${f.where}  ${f.key}  (${String(f.length)} chars) — ${f.reason}`,
    ),
    "",
    "Every NEXT_PUBLIC_ value is inlined into the client bundle in plain text, so",
    "these would ship to every visitor and could not be rotated without a release.",
    "",
    "Only public identifiers may carry the prefix:",
    ...PUBLIC_ALLOW_LIST.map((key) => `  ${key}`),
    "",
    "Keep server secrets under their plain names, read them only in a",
    "`server-only` module, and enter them in Vercel as Sensitive variables.",
    "",
  ].join("\n");
}
