"use client";

import { useId, useState } from "react";
import { savedName, submitScore, type GameId } from "@/lib/games/scores";
import { weekKey } from "@/lib/games/week";

export default function ScoreSubmit({
  game,
  score,
  seconds,
  onSubmitted,
  dark = false,
}: {
  game: GameId;
  score: number;
  seconds?: number;
  onSubmitted: () => void;
  dark?: boolean;
}) {
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : savedName()));
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  if (status === "done") {
    return (
      <p role="status" className={`font-bold ${dark ? "text-gold" : "text-teal"}`}>
        ✓ Score posted to the leaderboard!
      </p>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("saving");
        setError(null);
        const r = await submitScore(game, name, score, weekKey(), seconds);
        if (r.ok) {
          setStatus("done");
          onSubmitted();
        } else {
          setStatus("idle");
          setError(r.message);
        }
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={id} className={`text-sm font-semibold ${dark ? "text-white" : "text-navy"}`}>
        Put your name on the leaderboard
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          required
          autoComplete="nickname"
          placeholder="Your name or nickname"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-navy"
        />
        <button
          disabled={status === "saving" || !name.trim()}
          className="rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {status === "saving" ? "Posting…" : "Post score"}
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className={`text-sm font-semibold ${dark ? "text-gold" : "text-pink"}`}>
          {error}
        </p>
      )}
    </form>
  );
}
