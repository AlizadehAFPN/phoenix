"use client";

import Script from "next/script";
import { useId, useState, type FormEvent } from "react";

import { Beat } from "@/components/scroll/Beat";
import { CopyCard } from "@/components/ui/CopyCard";
import { COPY } from "@/content/copy";
import {
  LEAD_FIELDS,
  validateLead,
  type LeadErrors,
  type LeadField,
} from "@/lib/lead/validate";

import styles from "./DemoBeat.module.css";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

type Status = "idle" | "sending" | "sent" | "failed" | "invalid";

/**
 * Beat 10: the request-a-demo form (BRIEF A6). Six fields, a honeypot nobody
 * sees, Turnstile when a site key is configured, and one POST to the Route
 * Handler. Inputs are the base type size, so Safari never zooms them.
 */
export function DemoBeat() {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<LeadErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = Object.fromEntries(data.entries());

    const local = validateLead(input);
    if (!local.ok) {
      setErrors(local.errors);
      setStatus("invalid");
      return;
    }

    setErrors({});
    setStatus("sending");
    try {
      const response = await fetch("/api/demo", { method: "POST", body: data });
      const result = (await response.json()) as {
        ok: boolean;
        errors?: LeadErrors;
      };
      if (result.ok) {
        setStatus("sent");
        form.reset();
      } else if (result.errors !== undefined) {
        setErrors(result.errors);
        setStatus("invalid");
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    }
  }

  const field = (
    name: LeadField,
    type: "text" | "email" = "text",
    autoComplete?: string,
  ) => {
    const error = errors[name];
    const inputId = `${id}-${name}`;
    return (
      <div className={styles.field} key={name}>
        <label className={styles.label} htmlFor={inputId}>
          {COPY.demo.fields[name]}
        </label>
        <input
          id={inputId}
          className={styles.input}
          name={name}
          type={type}
          autoComplete={autoComplete}
          inputMode={type === "email" ? "email" : undefined}
          aria-invalid={error !== undefined}
          aria-describedby={
            error !== undefined ? `${inputId}-error` : undefined
          }
          required={
            name === "name" ||
            name === "email" ||
            name === "airline" ||
            name === "role"
          }
        />
        {error !== undefined ? (
          <p id={`${inputId}-error`} className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <Beat id="demo">
      <div className={`container ${styles.demo}`}>
        <CopyCard
          eyebrow={COPY.demo.eyebrow}
          headline={COPY.demo.headline}
          lead={COPY.demo.lead}
        />
        <form className={styles.form} onSubmit={submit} noValidate>
          {field("name", "text", "name")}
          {field("email", "email", "email")}
          {field("airline", "text", "organization")}
          {field("role", "text", "organization-title")}
          {field("fleetSize")}
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${id}-message`}>
              {COPY.demo.fields.message}
            </label>
            <textarea
              id={`${id}-message`}
              className={styles.input}
              name="message"
              rows={4}
              placeholder={COPY.demo.fields.messagePlaceholder}
            />
          </div>
          <div className={styles.honeypot} aria-hidden="true">
            <label htmlFor={`${id}-website`}>Website</label>
            <input
              id={`${id}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          {TURNSTILE_SITE_KEY !== null ? (
            <>
              <div
                className="cf-turnstile"
                data-sitekey={TURNSTILE_SITE_KEY}
                data-theme="auto"
              />
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="lazyOnload"
              />
            </>
          ) : null}
          <div className={styles.actions}>
            <button
              className={styles.submit}
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? COPY.demo.sending : COPY.demo.submit}
            </button>
            <p className={styles.privacy}>{COPY.demo.privacy}</p>
          </div>
          <p className={styles.status} role="status" aria-live="polite">
            {status === "sent" ? COPY.demo.sent : null}
            {status === "failed" ? COPY.demo.failed : null}
            {status === "invalid" ? COPY.demo.invalid : null}
          </p>
          {/* Keep the field list and the validation's in one place. */}
          <input type="hidden" name="fields" value={LEAD_FIELDS.join(",")} />
        </form>
      </div>
    </Beat>
  );
}
