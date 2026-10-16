"use client";

import { useActionState } from "react";
import { checkLamcNow } from "./actions";

export default function CheckLamcButton() {
  const [state, formAction, pending] = useActionState(checkLamcNow, { message: null });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        disabled={pending}
        className="w-fit rounded-full border-2 border-navy px-5 py-2 text-sm font-bold text-navy hover:bg-navy hover:text-white disabled:opacity-60"
      >
        {pending ? "Checking lamc.edu…" : "Check LAMC for new events now"}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-navy/80">
        {state.message}
      </p>
    </form>
  );
}
