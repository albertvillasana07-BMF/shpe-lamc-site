"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Form button that shows "Saving…" while the form is sending, then turns
 * green and says "✓ Saved" so admins know the change went through.
 */
export default function SubmitButton({
  children,
  className = "",
  pendingText = "Saving…",
  doneText = "✓ Saved",
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  doneText?: string;
}) {
  const { pending } = useFormStatus();
  const [done, setDone] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    // Show the confirmation for a few seconds after the save finishes
    const show = setTimeout(() => setDone(true), 0);
    const hide = setTimeout(() => setDone(false), 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [pending]);

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className={`${className} transition-colors disabled:cursor-wait disabled:opacity-70 ${
          done ? "!bg-teal !text-white !border-teal" : ""
        }`}
      >
        {pending ? pendingText : done ? doneText : children}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? pendingText : done ? "Saved" : ""}
      </span>
    </>
  );
}
