import "server-only";

import type { Lead } from "@/lib/lead/validate";
import { THEME } from "@/theme";

import { serverEnv } from "./env";

/**
 * Delivering a demo request (BRIEF A6, B5): Turnstile verification, then one
 * email through Resend's HTTP API to the lead address. Both secrets are read
 * from the server environment and never leave it; the lead address is server
 * configuration too, so it is not in the bundle.
 *
 * Plain `fetch` rather than the Resend SDK: two requests do not need a
 * dependency, and what goes over the wire is visible here.
 */

export type DeliveryResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "not-configured" | "turnstile" | "send-failed";
    };

const TURNSTILE_VERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_SEND = "https://api.resend.com/emails";

/**
 * Verifies a Turnstile token. In production a missing secret is a refusal:
 * the form must not accept unverified submissions because someone forgot a
 * variable. In development with no secret configured the check is skipped,
 * loudly, so the form can be exercised end to end.
 */
export async function verifyTurnstile(
  token: string | null,
  ip: string | null,
): Promise<boolean> {
  const env = serverEnv();
  if (env.turnstileSecret === null) {
    if (env.production) return false;
    console.warn(
      "[lead] TURNSTILE_SECRET_KEY is not set; skipping verification in development",
    );
    return true;
  }
  if (token === null || token === "") return false;

  const body = new URLSearchParams({
    secret: env.turnstileSecret,
    response: token,
  });
  if (ip !== null) body.set("remoteip", ip);

  try {
    const response = await fetch(TURNSTILE_VERIFY, { method: "POST", body });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

function escapeLine(value: string): string {
  return value.replace(/\r?\n/g, " ");
}

export async function deliverLead(lead: Lead): Promise<DeliveryResult> {
  const env = serverEnv();
  if (
    env.resendApiKey === null ||
    env.leadTo === null ||
    env.leadFrom === null
  ) {
    const missing = [
      env.resendApiKey === null ? "RESEND_API_KEY" : null,
      env.leadTo === null ? "LEAD_TO_EMAIL" : null,
      env.leadFrom === null ? "LEAD_FROM_EMAIL" : null,
    ].filter((n) => n !== null);
    console.error(`[lead] not configured; missing ${missing.join(", ")}`);
    return { ok: false, reason: "not-configured" };
  }

  const text = [
    `Demo request — ${THEME.productName}`,
    "",
    `Name:       ${escapeLine(lead.name)}`,
    `Email:      ${escapeLine(lead.email)}`,
    `Airline:    ${escapeLine(lead.airline)}`,
    `Role:       ${escapeLine(lead.role)}`,
    `Fleet size: ${escapeLine(lead.fleetSize) || "—"}`,
    "",
    lead.message === "" ? "(no message)" : lead.message,
  ].join("\n");

  try {
    const response = await fetch(RESEND_SEND, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.leadFrom,
        to: [env.leadTo],
        reply_to: lead.email,
        subject: `Demo request — ${escapeLine(lead.airline)}`,
        text,
      }),
    });
    if (!response.ok) {
      console.error(`[lead] Resend responded ${String(response.status)}`);
      return { ok: false, reason: "send-failed" };
    }
    return { ok: true };
  } catch {
    console.error("[lead] Resend request failed");
    return { ok: false, reason: "send-failed" };
  }
}
