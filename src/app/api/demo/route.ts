import { NextResponse } from "next/server";

import { validateLead } from "@/lib/lead/validate";
import { deliverLead, verifyTurnstile } from "@/server/lead";
import { memoryRateLimiter } from "@/server/rate-limit";

export const runtime = "nodejs";

/* Five requests per address per ten minutes; Turnstile is the real gate. */
const limiter = memoryRateLimiter(5, 10 * 60 * 1000);

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded !== null) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/**
 * The demo request. Accepts JSON or a form post. Replies with field errors
 * for a bad request and a reason code otherwise; never echoes what was sent.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let input: Record<string, unknown>;
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      input = (await request.json()) as Record<string, unknown>;
    } else {
      input = Object.fromEntries((await request.formData()).entries());
    }
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad-request" },
      { status: 400 },
    );
  }

  /* The honeypot: a field no person sees. Anything in it is a bot, which is
     told it succeeded. */
  if (typeof input.website === "string" && input.website !== "") {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request);
  if (!(await limiter.allow(ip ?? "unknown"))) {
    return NextResponse.json(
      { ok: false, reason: "rate-limited" },
      { status: 429 },
    );
  }

  const validation = validateLead(input);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, reason: "invalid", errors: validation.errors },
      { status: 422 },
    );
  }

  const token =
    typeof input["cf-turnstile-response"] === "string"
      ? input["cf-turnstile-response"]
      : null;
  if (!(await verifyTurnstile(token, ip))) {
    return NextResponse.json(
      { ok: false, reason: "turnstile" },
      { status: 403 },
    );
  }

  const delivery = await deliverLead(validation.lead);
  if (!delivery.ok) {
    return NextResponse.json(
      { ok: false, reason: delivery.reason },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse {
  return NextResponse.json(
    { ok: false, reason: "method" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
