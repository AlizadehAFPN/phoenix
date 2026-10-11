import "server-only";

/**
 * The server's configuration, read in one place and only on the server.
 *
 * `server-only` makes importing this module from a client component a build
 * error, which is the second lock after the env allow-list in
 * `scripts/lib/embedded-secrets.mjs`: a secret can neither carry the public
 * prefix nor be read from code that ships to the browser.
 *
 * Values are never logged. A missing value is reported by NAME.
 */

export interface ServerEnv {
  readonly resendApiKey: string | null;
  readonly turnstileSecret: string | null;
  readonly leadTo: string | null;
  readonly leadFrom: string | null;
  readonly production: boolean;
}

function read(name: string): string | null {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function serverEnv(): ServerEnv {
  return {
    resendApiKey: read("RESEND_API_KEY"),
    turnstileSecret: read("TURNSTILE_SECRET_KEY"),
    leadTo: read("LEAD_TO_EMAIL"),
    leadFrom: read("LEAD_FROM_EMAIL"),
    production: process.env.NODE_ENV === "production",
  };
}
