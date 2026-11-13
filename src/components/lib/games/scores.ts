import { createClient } from "@/lib/supabase/client";
import { getMember } from "@/lib/games/member";

export type GameId = "wordle" | "breakout" | "rocket";
export type ScoreRow = {
  player_name: string;
  score: number;
  seconds: number | null;
  created_at: string;
  member_key?: string | null;
  badges?: string[];
};

/** Rocket SHPE badges shown next to names on the leaderboard */
export const BADGES: Record<string, { icon: string; label: string }> = {
  earth: { icon: "🌍", label: "Reached Earth" },
  boss: { icon: "🛸", label: "Beat the mothership" },
  pluto: { icon: "🪐", label: "Reached Pluto" },
};

export async function submitScore(game: GameId, score: number, week: string, seconds?: number, badges: string[] = []) {
  const supabase = createClient();
  const m = getMember();
  const { error } = await supabase.rpc("submit_game_score", {
    p_game: game,
    p_score: Math.round(score),
    p_week: week,
    p_seconds: seconds == null ? null : Math.round(seconds),
    p_email: m?.email ?? null,
    p_student_id: m?.studentId ?? null,
    p_badges: badges,
  });
  // The database explains what was wrong in error.message
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
    .select("player_name, score, seconds, created_at, member_key, badges")
    .eq("game", game)
    .order("score", { ascending: lowerIsBetter })
    .order("seconds", { ascending: true, nullsFirst: false })
    .limit(100);
  if (week) q = q.eq("week", week);
  const { data } = await q;

  const best = new Map<string, ScoreRow>();
  const earned = new Map<string, Set<string>>(); // every badge a player has earned on any run
  for (const row of (data ?? []) as ScoreRow[]) {
    const key = row.member_key || row.player_name.toLowerCase();
    if (!best.has(key)) best.set(key, { ...row });
    const set = earned.get(key) ?? new Set<string>();
    (row.badges ?? []).forEach((b) => set.add(b));
    earned.set(key, set);
  }
  for (const [key, row] of best) row.badges = Array.from(earned.get(key) ?? []);
  return Array.from(best.values()).slice(0, 10);
}
