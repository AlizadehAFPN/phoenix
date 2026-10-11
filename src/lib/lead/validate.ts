/**
 * The demo request, validated the same way on the client (inline messages)
 * and on the server (the only check that counts). Pure: no I/O, no env.
 */

export const LEAD_FIELDS = [
  "name",
  "email",
  "airline",
  "role",
  "fleetSize",
  "message",
] as const;

export type LeadField = (typeof LEAD_FIELDS)[number];

export interface Lead {
  readonly name: string;
  readonly email: string;
  readonly airline: string;
  readonly role: string;
  readonly fleetSize: string;
  readonly message: string;
}

export type LeadErrors = Partial<Record<LeadField, string>>;

export type LeadValidation =
  | { readonly ok: true; readonly lead: Lead }
  | { readonly ok: false; readonly errors: LeadErrors };

const LIMITS: Readonly<Record<LeadField, number>> = {
  name: 120,
  email: 254,
  airline: 120,
  role: 120,
  fleetSize: 40,
  message: 4000,
};

const REQUIRED: readonly LeadField[] = ["name", "email", "airline", "role"];

/* A work email: one `@`, a dot in the domain, no whitespace. The server does
   not try to be cleverer than this; the reply is what proves the address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value: unknown, limit: number): string {
  if (typeof value !== "string") return "";
  /* Collapse control characters, which have no place in a form field and are
     how header injection would otherwise be attempted through `reply_to`. */
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, limit);
}

export function validateLead(input: Record<string, unknown>): LeadValidation {
  const lead: Record<LeadField, string> = {
    name: clean(input.name, LIMITS.name),
    email: clean(input.email, LIMITS.email),
    airline: clean(input.airline, LIMITS.airline),
    role: clean(input.role, LIMITS.role),
    fleetSize: clean(input.fleetSize, LIMITS.fleetSize),
    message: clean(input.message, LIMITS.message),
  };

  const errors: LeadErrors = {};
  for (const field of REQUIRED) {
    if (lead[field] === "") errors[field] = "Required";
  }
  if (lead.email !== "" && !EMAIL.test(lead.email))
    errors.email = "Enter a work email address";
  if (lead.email.includes("\n") || lead.email.includes("\r"))
    errors.email = "Enter a work email address";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, lead };
}
