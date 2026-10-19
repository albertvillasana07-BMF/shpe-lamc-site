"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { importLamcEvents, type ImportedEvent } from "../actions";

export default function ImportFromHash() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "empty" }
    | { kind: "done"; found: number; added: number; titles: string[] }
    | { kind: "error"; message: string }
  >({ kind: "loading" });
  const ran = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let events: ImportedEvent[] = [];
    try {
      const raw = decodeURIComponent(window.location.hash.slice(1));
      if (raw) events = JSON.parse(raw);
    } catch {
      setTimeout(() => setState({ kind: "error", message: "Couldn't read the events. Try clicking the bookmark again." }), 0);
      return;
    }
    // Clear the data out of the address bar
    history.replaceState(null, "", window.location.pathname);

    if (!Array.isArray(events) || events.length === 0) {
      setTimeout(() => setState({ kind: "empty" }), 0);
      return;
    }

    importLamcEvents(events)
      .then((r) => {
        if (r.ok) setState({ kind: "done", found: r.found, added: r.added, titles: events.map((e) => e.t) });
        else setState({ kind: "error", message: r.message });
      })
      .catch(() => setState({ kind: "error", message: "Something went wrong saving the events. Try again." }));
  }, []);

  useEffect(() => {
    if (state.kind !== "loading") resultRef.current?.focus();
  }, [state.kind]);

  return (
    <div ref={resultRef} tabIndex={-1} role="status" aria-live="polite" className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm focus:outline-none">
      {state.kind === "loading" && <p className="text-navy/80">Importing events from LAMC…</p>}

      {state.kind === "empty" && (
        <p className="text-navy/80">
          No events came through. Open <strong>lamc.edu/campus-life/events</strong>, then click your{" "}
          <strong>Send to SHPE</strong> bookmark.
        </p>
      )}

      {state.kind === "error" && <p className="font-semibold text-pink">{state.message}</p>}

      {state.kind === "done" && (
        <>
          <p className="text-lg font-bold text-teal">
            ✓ Found {state.found} upcoming event{state.found === 1 ? "" : "s"}, {state.added} new
          </p>
          <p className="mt-1 text-sm text-navy/80">
            {state.added < state.found
              ? "The rest were already in your list. "
              : ""}
            They&apos;re waiting in Suggested from LAMC for approval.
          </p>
          <ul className="ml-5 mt-3 list-disc text-sm text-navy/80">
            {state.titles.slice(0, 12).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
            {state.titles.length > 12 && <li>and {state.titles.length - 12} more</li>}
          </ul>
        </>
      )}

      {state.kind !== "loading" && (
        <Link
          href="/admin/events"
          className="mt-5 inline-block rounded-full bg-navy px-5 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          Go to Events to approve them
        </Link>
      )}
    </div>
  );
}
