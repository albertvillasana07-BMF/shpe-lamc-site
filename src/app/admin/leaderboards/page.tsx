import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { deleteName, deleteScore } from "./actions";

export const metadata: Metadata = { title: "Leaderboards" };

type Row = { id: string; game: string; player_name: string; score: number; week: string; created_at: string };

const GAME_NAMES: Record<string, string> = { wordle: "Wordle", rocket: "Rocket SHPE", breakout: "Discipline Breakout" };

export default async function AdminLeaderboardsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_scores")
    .select("id, game, player_name, score, week, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">Leaderboards</h1>
      <p className="mb-6 text-sm text-navy/70">
        The newest 200 scores across all games. Delete anything inappropriate. The site
        already blocks common bad words, but people get creative.
      </p>

      {rows.length === 0 ? (
        <p className="text-navy/70">No scores yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recent game scores</caption>
            <thead className="bg-navy/5 text-navy">
              <tr>
                <th scope="col" className="px-4 py-2">Name</th>
                <th scope="col" className="px-4 py-2">Game</th>
                <th scope="col" className="px-4 py-2">Score</th>
                <th scope="col" className="px-4 py-2">Week</th>
                <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-black/5">
                  <td className="px-4 py-2 font-semibold text-navy">{r.player_name}</td>
                  <td className="px-4 py-2 text-navy/80">{GAME_NAMES[r.game] ?? r.game}</td>
                  <td className="px-4 py-2 tabular-nums text-navy/80">
                    {r.game === "wordle" ? `${r.score}/6` : r.score.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-navy/80">{r.week}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-3">
                      <form action={deleteScore}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-xs font-bold text-pink hover:underline">
                          Delete<span className="sr-only"> score by {r.player_name}</span>
                        </button>
                      </form>
                      <form action={deleteName}>
                        <input type="hidden" name="name" value={r.player_name} />
                        <button className="text-xs font-bold text-pink hover:underline">
                          Delete all by this name<span className="sr-only">: {r.player_name}</span>
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
