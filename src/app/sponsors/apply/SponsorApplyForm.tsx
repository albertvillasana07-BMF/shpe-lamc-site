"use client";

import { useActionState } from "react";
import { submitSponsorInquiry } from "./actions";

export default function SponsorApplyForm() {
  const [state, formAction, pending] = useActionState(submitSponsorInquiry, {
    ok: false,
    error: null,
  });

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-teal/10 p-6 text-center">
        <p className="font-bold text-teal">Thanks for reaching out!</p>
        <p className="mt-1 text-sm text-navy/70">
          We&apos;ll be in touch soon to talk through sponsorship options.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="organization"
        placeholder="Organization name"
        required
        className="rounded-lg border border-black/10 px-4 py-3"
      />
      <input
        name="contact_name"
        placeholder="Contact name"
        required
        className="rounded-lg border border-black/10 px-4 py-3"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="rounded-lg border border-black/10 px-4 py-3"
      />
      <input
        name="phone"
        placeholder="Phone (optional)"
        className="rounded-lg border border-black/10 px-4 py-3"
      />
      <textarea
        name="message"
        placeholder="Anything else you'd like us to know?"
        rows={3}
        className="rounded-lg border border-black/10 px-4 py-3"
      />
      {state.error && <p className="text-sm font-semibold text-pink">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-orange px-6 py-3 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
