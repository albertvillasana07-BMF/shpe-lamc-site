"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { submitScore, type GameId } from "@/lib/games/scores";
import { currentPlayer, signInMember, signOutMember, type Player } from "@/lib/games/member";
import { weekKey } from "@/lib/games/week";

/**
 * Posting a score requires a SHPE member sign-in (email + student ID from the Join page)
 * or a board account. Signed-in players' scores post automatically, under their member name.
 */
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
  const [player, setPlayer] = useState<Player | undefined>(undefined); // undefined = still checking
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sid, setSid] = useState("");
  const posted = useRef(false);
  const id = useId();

  const text = dark ? "text-white" : "text-navy";
  const sub = dark ? "text-white/80" : "text-navy/70";
  const errColor = dark ? "text-gold" : "text-pink";
  const field = "min-w-0 flex-1 rounded-lg border px-3 py-2 text-navy";

  async function post() {
    if (posted.current) return;
    posted.current = true;
    setStatus("saving");
    setError(null);
    const r = await submitScore(game, score, weekKey(), seconds);
    if (r.ok) {
      setStatus("done");
      onSubmitted();
    } else {
      posted.current = false;
      setStatus("idle");
      setError(r.message);
    }
  }

  // Find out who's playing, then auto-post if they're signed in
  useEffect(() => {
    let cancelled = false;
    currentPlayer().then((p) => {
      if (cancelled) return;
      setPlayer(p);
      if (p) setTimeout(() => post(), 0);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (player === undefined) {
    return <p className={`text-sm ${sub}`}>Checking sign-in…</p>;
  }

  if (status === "done") {
    return (
      <div role="status">
        <p className={`font-bold ${dark ? "text-gold" : "text-teal"}`}>
          ✓ Posted to the leaderboard as {player?.name}!
        </p>
        {player?.kind === "member" && (
          <button
            type="button"
            onClick={() => {
              signOutMember();
              setPlayer(null);
            }}
            className={`mt-1 text-xs underline underline-offset-2 ${sub}`}
          >
            Not you? Sign out
          </button>
        )}
      </div>
    );
  }

  if (player) {
    return (
      <div className="flex flex-col gap-2">
        <p className={`text-sm font-semibold ${text}`}>
          {status === "saving" ? `Posting as ${player.name}…` : `Playing as ${player.name}`}
        </p>
        {error && (
          <>
            <p role="alert" className={`text-sm font-semibold ${errColor}`}>{error}</p>
            <button
              type="button"
              onClick={() => post()}
              className="w-fit rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              Try posting again
            </button>
          </>
        )}
      </div>
    );
  }

  // Not signed in: member sign-in, then post
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("saving");
        setError(null);
        const r = await signInMember(email, sid);
        if (!r.ok) {
          setStatus("idle");
          setError(r.message);
          return;
        }
        setPlayer({ kind: "member", name: r.member.name });
        posted.current = false;
        await post();
      }}
      className="flex flex-col gap-2"
    >
      <p className={`text-sm font-semibold ${text}`}>
        Sign in as a SHPE member to put this score on the leaderboard
      </p>
      <p className={`text-xs ${sub}`}>
        Use the email and student ID you joined with. You stay signed in on this device, and future scores post on their own.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">Email</label>
        <input
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="Email"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={field}
        />
        <label htmlFor={`${id}-sid`} className="sr-only">Student ID</label>
        <input
          id={`${id}-sid`}
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="Student ID"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={field}
        />
        <button
          disabled={status === "saving" || !email.trim() || !sid.trim()}
          className="rounded-full bg-orange px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {status === "saving" ? "Signing in…" : "Sign in & post"}
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className={`text-sm font-semibold ${errColor}`}>
          {error}
        </p>
      )}
      <p className={`text-xs ${sub}`}>
        Not a member yet?{" "}
        <Link href="/join" className="font-bold underline underline-offset-2">
          Join SHPE LAMC
        </Link>{" "}
        — it&apos;s free.
      </p>
    </form>
  );
}
