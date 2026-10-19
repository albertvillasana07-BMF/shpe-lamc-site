import { createClient } from "@/lib/supabase/client";

export type GameId = "wordle" | "breakout" | "rocket";
export type ScoreRow = { player_name: string; score: number; seconds: number | null; created_at: string };

const NAME_KEY = "shpe-player-name";

export function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function submitScore(game: GameId, name: string, score: number, week: string, seconds?: number) {
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_game_score", {
    p_game: game,
    p_name: name,
    p_score: Math.round(score),
    p_week: week,
    p_seconds: seconds == null ? null : Math.round(seconds),
  });
  if (!error) {
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
  }
  // The database explains what was wrong (bad name, etc.) in error.message
  return error ? { ok: false as const, message: error.message.replace(/^.*?:\s*/, "") } : { ok: true as const };
}

/**
 * Top 10, best score per player name.
 * Wordle: fewest guesses, then fastest time. Other games: highest score.
 */
export async function fetchLeaderboard(game: GameId, week?: string): Promise<ScoreRow[]> {
  const supabase = createClient();
  const lowerIsBetter = game === "wordle";
  let q = supabase
    .from("game_scores")
    .select("player_name, score, seconds, created_at")
    .eq("game", game)
    .order("score", { ascending: lowerIsBetter })
    .order("seconds", { ascending: true, nullsFirst: false })
    .limit(100);
  if (week) q = q.eq("week", week);
  const { data } = await q;

  const best = new Map<string, ScoreRow>();
  for (const row of (data ?? []) as ScoreRow[]) {
    const key = row.player_name.toLowerCase();
    if (!best.has(key)) best.set(key, row);
  }
  return Array.from(best.values()).slice(0, 10);
}
