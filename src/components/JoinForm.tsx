"use client";

import { useActionState, useEffect, useRef } from "react";
import { signupMember } from "../app/join/actions";
import ShpeText from "@/components/ShpeText";

const field = "rounded-lg border px-4 py-3 text-navy";
const label = "flex flex-col gap-1 text-sm font-semibold text-navy";

export default function JoinForm() {
  const [state, formAction, pending] = useActionState(signupMember, {
    ok: false,
    error: null,
  });
  const successRef = useRef<HTMLDivElement>(null);

  // Move focus to the confirmation so screen reader users hear it
  useEffect(() => {
    if (state.ok) successRef.current?.focus();
  }, [state.ok]);

  if (state.ok) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl bg-teal/10 p-6 text-center"
      >
        <p className="font-bold text-teal">You&apos;re on the list!</p>
        <p className="mt-1 text-sm text-navy/80">
          Welcome to <span className="font-shpe">SHPE</span> LAMC. Keep an eye on your
          email for next steps.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-navy/70">
        Fields marked <span aria-hidden="true">*</span>
        <span className="sr-only">required</span> are required.
      </p>
      <label className={label}>
        <span>
          Full name <span aria-hidden="true">*</span>
        </span>
        <input
          name="full_name"
          required
          autoComplete="name"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "join-error" : undefined}
          className={field}
        />
      </label>
      <label className={label}>
        <span>
          Email <span aria-hidden="true">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "join-error" : undefined}
          className={field}
        />
      </label>
      <label className={label}>
        Student ID (optional)
        <input name="student_id" inputMode="numeric" autoComplete="off" className={field} />
      </label>
      {state.error && (
        <p id="join-error" role="alert" className="text-sm font-semibold text-pink">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-full bg-orange px-6 py-3 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Joining…" : <ShpeText>Join SHPE LAMC</ShpeText>}
      </button>
    </form>
  );
}
