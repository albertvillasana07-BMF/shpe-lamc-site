"use client";

import { useEffect, useId, useState } from "react";
import { fetchLeaderboard, type GameId, type ScoreRow } from "@/lib/games/scores";
import { lastWeekKey, weekKey } from "@/lib/games/week";

type Tab = { id: string; label: string; week?: string };

function formatScore(game: GameId, row: ScoreRow) {
  if (game === "wordle") {
    const t = row.seconds == null ? "" : ` · ${Math.floor(row.seconds / 60)}:${String(row.seconds % 60).padStart(2, "0")}`;
    return `${row.score}/6${t}`;
  }
  return row.score.toLocaleString();
}

export default function Leaderboard({
  game,
  refreshKey = 0,
  dark = false,
}: {
  game: GameId;
  refreshKey?: number;
  dark?: boolean;
}) {
  const tabs: Tab[] =
    game === "wordle"
      ? [
          { id: "week", label: "This week", week: weekKey() },
          { id: "last", label: "Last week", week: lastWeekKey() },
        ]
      : [
          { id: "week", label: "This week", week: weekKey() },
          { id: "all", label: "All time" },
        ];
  const [tab, setTab] = useState(tabs[0].id);
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const headingId = useId();
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(game, active.week).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [game, active.week, refreshKey]);

  const text = dark ? "text-white" : "text-navy";
  const sub = dark ? "text-white/80" : "text-navy/70";
  const card = dark ? "bg-white/5 border-white/10" : "bg-white border-black/5";

  return (
    <section aria-labelledby={headingId} className={`rounded-2xl border p-5 shadow-sm ${card}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className={`text-lg ${text}`}>
          🏆 Leaderboard
        </h2>
        <div role="group" aria-label="Leaderboard time range" className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => {
                setRows(null);
                setTab(t.id);
              }}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                tab === t.id
                  ? "bg-orange text-white"
                  : dark
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-navy/5 text-navy hover:bg-navy/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {rows === null ? (
        <p className={`text-sm ${sub}`}>Loading scores…</p>
      ) : rows.length === 0 ? (
        <p className={`text-sm ${sub}`}>No scores yet. Be the first!</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <li
              key={r.player_name + i}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm ${
                i === 0 ? (dark ? "bg-gold/20" : "bg-gold/30") : ""
              }`}
            >
              <span className={`flex items-center gap-2 font-semibold ${text}`}>
                <span className="w-6 text-right" aria-hidden="true">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span className="sr-only">Rank {i + 1}:</span>
                {r.player_name}
              </span>
              <span className={`font-bold tabular-nums ${text}`}>{formatScore(game, r)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
