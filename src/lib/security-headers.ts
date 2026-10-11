/**
 * The response headers every route is served with.
 *
 * Declared in `next.config.ts` rather than `vercel.json` (BRIEF §3) so the
 * same headers ship on the owner's own server later; nothing here is
 * Vercel-specific.
 *
 * THE CONTENT SECURITY POLICY. The page is statically rendered, and Next's
 * hydration bootstrap is an inline script whose content changes with every
 * build, so `script-src` has to allow inline scripts. A nonce-based strict
 * policy is possible with a `proxy.ts` that generates a nonce per request, at
 * the cost of rendering the page dynamically on every visit; for a landing
 * page whose first contentful paint is the whole job, static wins. Everything
 * else is as tight as the page allows:
 *
 * - `'wasm-unsafe-eval'` and `'unsafe-eval'` are for the Basis Universal
 *   transcoder, which decodes the KTX2 globe textures. It is compiled with
 *   Emscripten's embind, which builds its function invokers from strings
 *   with the `Function` constructor; the transcoder runs in a worker built
 *   from a `blob:` URL, and a blob worker inherits THIS policy. Without
 *   `'unsafe-eval'` every texture fails to decode and the planet renders
 *   black (seen on the first production deploy, 2026-10-11). The cost is
 *   small here: the page already has to allow `'unsafe-inline'` for Next's
 *   static bootstrap, which is the larger opening of the two, and the page
 *   renders no user content.
 * - `worker-src blob:` is for the same worker.
 * - `challenges.cloudflare.com` is Turnstile, the only third party on the page.
 */

const TURNSTILE = "https://challenges.cloudflare.com";

export function contentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "'wasm-unsafe-eval'",
    TURNSTILE,
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    `frame-src ${TURNSTILE}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    /* No `upgrade-insecure-requests`: every URL on the page is relative,
       so on HTTPS there is nothing to upgrade, and HSTS below already keeps
       the browser on HTTPS. Over plain-HTTP localhost it made WebKit rewrite
       the scripts' URLs to https:// and fail, so a local production run was
       a black page in Safari. */
  ].join("; ");
}

export function securityHeaders(): readonly { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
  ];
}
