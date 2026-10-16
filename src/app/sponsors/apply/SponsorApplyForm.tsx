"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitSponsorInquiry } from "./actions";

const field = "rounded-lg border px-4 py-3 text-navy";
const label = "flex flex-col gap-1 text-sm font-semibold text-navy";

export default function SponsorApplyForm() {
  const [state, formAction, pending] = useActionState(submitSponsorInquiry, {
    ok: false,
    error: null,
  });
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok) successRef.current?.focus();
  }, [state.ok]);

  if (state.ok) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-2xl bg-teal/10 p-6 text-center">
        <p className="font-bold text-teal">Thanks for reaching out!</p>
        <p className="mt-1 text-sm text-navy/80">
          We&apos;ll be in touch soon to talk through sponsorship options.
        </p>
      </div>
    );
  }

  const invalid = state.error ? true : undefined;
  const described = state.error ? "sponsor-error" : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-navy/70">
        Fields marked <span aria-hidden="true">*</span>
        <span className="sr-only">required</span> are required.
      </p>
      <label className={label}>
        <span>
          Organization name <span aria-hidden="true">*</span>
        </span>
        <input name="organization" required autoComplete="organization" aria-invalid={invalid} aria-describedby={described} className={field} />
      </label>
      <label className={label}>
        <span>
          Contact name <span aria-hidden="true">*</span>
        </span>
        <input name="contact_name" required autoComplete="name" aria-invalid={invalid} aria-describedby={described} className={field} />
      </label>
      <label className={label}>
        <span>
          Email <span aria-hidden="true">*</span>
        </span>
        <input name="email" type="email" required autoComplete="email" aria-invalid={invalid} aria-describedby={described} className={field} />
      </label>
      <label className={label}>
        Phone (optional)
        <input name="phone" type="tel" autoComplete="tel" className={field} />
      </label>
      <label className={label}>
        Anything else you&apos;d like us to know? (optional)
        <textarea name="message" rows={3} className={field} />
      </label>
      {state.error && (
        <p id="sponsor-error" role="alert" className="text-sm font-semibold text-pink">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-full bg-orange px-6 py-3 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Send sponsor inquiry"}
      </button>
    </form>
  );
}
