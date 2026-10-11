import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "./security-headers";

describe("the content security policy", () => {
  it("lets the KTX2 transcoder's worker evaluate its embind invokers in production", () => {
    const csp = contentSecurityPolicy();
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it("keeps everything else locked to the site's own origin", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    /* Relative URLs only; HSTS keeps the page on HTTPS. Upgrading broke
       local production runs in WebKit. */
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
