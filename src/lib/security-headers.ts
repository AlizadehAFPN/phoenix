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
 * - `'wasm-unsafe-eval'` is for the Basis Universal transcoder, which decodes
 *   the KTX2 globe textures in WebAssembly. It permits WebAssembly only, not
 *   JavaScript `eval`.
 * - `worker-src blob:` is for three's KTX2Loader, which runs the transcoder in
 *   a worker built from a blob URL.
 * - `challenges.cloudflare.com` is Turnstile, the only third party on the page.
 * - `'unsafe-eval'` is added in development only, for React Refresh.
 */

const TURNSTILE = "https://challenges.cloudflare.com";

export function contentSecurityPolicy(development: boolean): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    TURNSTILE,
    ...(development ? ["'unsafe-eval'"] : []),
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
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function securityHeaders(
  development: boolean,
): readonly { key: string; value: string }[] {
  return [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(development),
    },
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
