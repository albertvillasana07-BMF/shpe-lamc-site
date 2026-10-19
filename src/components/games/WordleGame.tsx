"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeAnswers } from "@/lib/games/answers";
import { daysUntilReset, weekKey, weekNumber } from "@/lib/games/week";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

type Mark = "correct" | "present" | "absent";
type Saved = {
  guesses: string[];
  status: "playing" | "won" | "lost";
  startedAt: number | null;
  seconds: number | null;
};

const ROWS = 6;
const LEN = 5;
const KEYS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

// SHPE colors instead of green/yellow, each with a symbol for colorblind players
const STYLE: Record<Mark, string> = {
  correct: "bg-[#0070C0] border-[#0070C0] text-white",
  present: "bg-[#C2410C] border-[#C2410C] text-white",
  absent: "bg-[#4B5563] border-[#4B5563] text-white",
};
const SPOKEN: Record<Mark, string> = {
  correct: "correct",
  present: "in the word, wrong spot",
  absent: "not in the word",
};
const EMOJI: Record<Mark, string> = { correct: "🟦", present: "🟧", absent: "⬛" };

function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(LEN).fill("absent");
  const left: Record<string, number> = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (marks[i] === "correct") continue;
    if (left[guess[i]]) {
      marks[i] = "present";
      left[guess[i]]--;
    }
  }
  return marks;
}

export default function WordleGame() {
  const [mounted, setMounted] = useState(false);
  const [week, setWeek] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<Saved>({ guesses: [], status: "playing", startedAt: null, seconds: null });
  const [current, setCurrent] = useState("");
  const [valid, setValid] = useState<Set<string> | null>(null);
  const [toast, setToast] = useState("");
  const [announce, setAnnounce] = useState("");
  const [shake, setShake] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [copied, setCopied] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load this week's word and any saved progress
  useEffect(() => {
    const wk = weekKey();
    const list = decodeAnswers();
    const n = weekNumber();
    const word = list[((n % list.length) + list.length) % list.length].toUpperCase();
    let saved: Saved | null = null;
    try {
      const raw = localStorage.getItem(`shpe-wordle-${wk}`);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    setTimeout(() => {
      setWeek(wk);
      setAnswer(word);
      if (saved) setState(saved);
      setMounted(true);
    }, 0);

    fetch("/games/words5.txt")
      .then((r) => r.text())
      .then((t) => {
        const s = new Set<string>();
        for (let i = 0; i < t.length; i += 5) s.add(t.slice(i, i + 5).toUpperCase());
        setValid(s);
      })
      .catch(() => setValid(new Set())); // if it fails, accept any guess
  }, []);

  // Save progress for this week
  useEffect(() => {
    if (!mounted || !week) return;
    try {
      localStorage.setItem(`shpe-wordle-${week}`, JSON.stringify(state));
    } catch {}
  }, [state, week, mounted]);

  const marks = useMemo(() => state.guesses.map((g) => score(g, answer)), [state.guesses, answer]);

  const keyMarks = useMemo(() => {
    const rank: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };
    const out: Record<string, Mark> = {};
    state.guesses.forEach((g, gi) =>
      g.split("").forEach((ch, i) => {
        const m = marks[gi][i];
        if (!out[ch] || rank[m] > rank[out[ch]]) out[ch] = m;
      })
    );
    return out;
  }, [state.guesses, marks]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setAnnounce(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  const submit = useCallback(() => {
    if (state.status !== "playing") return;
    if (current.length < LEN) {
      flash("Not enough letters");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    if (valid && valid.size > 0 && !valid.has(current)) {
      flash("Not in word list");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const guesses = [...state.guesses, current];
    const m = score(current, answer);
    const won = current === answer;
    const lost = !won && guesses.length >= ROWS;
    const startedAt = state.startedAt ?? Date.now();
    const seconds = won || lost ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : null;
    setState({ guesses, status: won ? "won" : lost ? "lost" : "playing", startedAt, seconds });
    setCurrent("");
    const spoken = current
      .split("")
      .map((ch, i) => `${ch} ${SPOKEN[m[i]]}`)
      .join(", ");
    setAnnounce(
      `Guess ${guesses.length}: ${spoken}.` +
        (won ? " You got it!" : lost ? ` Out of guesses. The word was ${answer}.` : "")
    );
  }, [state, current, valid, answer, flash]);

  const press = useCallback(
    (key: string) => {
      if (state.status !== "playing") return;
      if (key === "ENTER") return submit();
      if (key === "BACK") return setCurrent((c) => c.slice(0, -1));
      if (/^[A-Z]$/.test(key)) {
        setCurrent((c) => (c.length < LEN ? c + key : c));
        if (!state.startedAt) setState((s) => ({ ...s, startedAt: Date.now() }));
      }
    },
    [state.status, state.startedAt, submit]
  );

  // Physical keyboard (ignored while typing a name in a form field)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        if (t.tagName === "BUTTON") return; // let on-screen buttons work normally
        e.preventDefault();
        press("ENTER");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        press("BACK");
      } else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  if (!mounted) {
    return <p className="text-navy/80">Loading this week&apos;s puzzle…</p>;
  }

  const done = state.status !== "playing";
  const shareText =
    `SHPE LAMC Wordle ${week} ${state.status === "won" ? state.guesses.length : "X"}/6\n` +
    marks.map((row) => row.map((m) => EMOJI[m]).join("")).join("\n");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col items-center">
        <p className="mb-4 text-center text-sm text-navy/80">
          Guess the 5-letter word in 6 tries. New word every Monday (
          {daysUntilReset() === 1 ? "tomorrow" : `in ${daysUntilReset()} days`}).
        </p>

        {/* Board */}
        <div
          role="grid"
          aria-label="Wordle board"
          className={`grid gap-1.5 ${shake ? "animate-[shpe-shake_0.4s]" : ""}`}
        >
          {Array.from({ length: ROWS }).map((_, r) => {
            const word = r < state.guesses.length ? state.guesses[r] : r === state.guesses.length ? current : "";
            return (
              <div key={r} role="row" className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: LEN }).map((__, c) => {
                  const ch = word[c] ?? "";
                  const m = r < state.guesses.length ? marks[r][c] : null;
                  return (
                    <div
                      key={c}
                      role="gridcell"
                      aria-label={ch ? `${ch}${m ? `, ${SPOKEN[m]}` : ""}` : "empty"}
                      className={`flex h-14 w-14 items-center justify-center rounded-md border-2 text-2xl font-extrabold uppercase sm:h-16 sm:w-16 ${
                        m ? STYLE[m] : ch ? "border-navy/60 text-navy" : "border-navy/20 text-navy"
                      }`}
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs font-semibold text-navy/80" aria-hidden="true">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[#0070C0]" /> Right spot</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[#C2410C]" /> Wrong spot</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[#4B5563]" /> Not in word</span>
        </div>

        <div className="h-8 pt-2 text-center font-bold text-navy" aria-hidden="true">{toast}</div>
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>

        {/* Keyboard */}
        {!done && (
          <div className="flex w-full max-w-md flex-col gap-1.5" aria-label="On-screen keyboard">
            {KEYS.map((row, i) => (
              <div key={row} className="flex justify-center gap-1">
                {i === 2 && (
                  <button type="button" onClick={() => press("ENTER")} className="h-12 rounded-md bg-navy/15 px-2 text-xs font-bold text-navy hover:bg-navy/25">
                    Enter
                  </button>
                )}
                {row.split("").map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    aria-label={keyMarks[k] ? `${k}, ${SPOKEN[keyMarks[k]]}` : k}
                    className={`h-12 min-w-0 flex-1 rounded-md text-sm font-bold ${
                      keyMarks[k] ? STYLE[keyMarks[k]] : "bg-navy/10 text-navy hover:bg-navy/20"
                    }`}
                  >
                    {k}
                  </button>
                ))}
                {i === 2 && (
                  <button type="button" onClick={() => press("BACK")} className="h-12 rounded-md bg-navy/15 px-2 text-sm font-bold text-navy hover:bg-navy/25">
                    <span aria-hidden="true">⌫</span>
                    <span className="sr-only">Delete letter</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Finished */}
        {done && (
          <div className="mt-2 w-full max-w-md rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm">
            {state.status === "won" ? (
              <p className="text-xl font-extrabold text-navy">
                🎉 Solved in {state.guesses.length}/6
                {state.seconds != null && (
                  <span className="block text-sm font-semibold text-navy/70">
                    Time: {Math.floor(state.seconds / 60)}:{String(state.seconds % 60).padStart(2, "0")}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xl font-extrabold text-navy">
                The word was <span className="text-orange">{answer}</span>
              </p>
            )}
            <p className="mt-1 text-sm text-navy/70">
              Come back Monday for a new word.
            </p>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              className="mt-3 rounded-full border-2 border-navy px-4 py-1.5 text-sm font-bold text-navy hover:bg-navy hover:text-white"
            >
              {copied ? "✓ Copied" : "Copy my result"}
            </button>

            {state.status === "won" && (
              <div className="mt-4 text-left">
                <ScoreSubmit
                  game="wordle"
                  score={state.guesses.length}
                  seconds={state.seconds ?? undefined}
                  onSubmitted={() => setRefresh((r) => r + 1)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <Leaderboard game="wordle" refreshKey={refresh} />
        <p className="mt-2 text-xs text-navy/70">Ranked by fewest guesses, then fastest time.</p>
      </div>

      <style>{`@keyframes shpe-shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
