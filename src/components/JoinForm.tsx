"use client";

import { useActionState } from "react";
import { signupMember } from "../app/join/actions";

export default function JoinForm() {
  const [state, formAction, pending] = useActionState(signupMember, {
    ok: false,
    error: null,
  });

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-teal/10 p-6 text-center">
        <p className="font-bold text-teal">You&apos;re on the list!</p>
        <p className="mt-1 text-sm text-navy/70">
          Welcome to SHPE LAMC — keep an eye on your email for next steps.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="full_name"
        placeholder="Full name"
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
        name="student_id"
        placeholder="Student ID (optional)"
        className="rounded-lg border border-black/10 px-4 py-3"
      />
      {state.error && <p className="text-sm font-semibold text-pink">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-orange px-6 py-3 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Joining…" : "Join SHPE LAMC"}
      </button>
    </form>
  );
}
