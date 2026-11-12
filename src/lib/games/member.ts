import { createClient } from "@/lib/supabase/client";

/** A SHPE member signed in for the games (email + student ID from the Join page). */
export type GameMember = { email: string; studentId: string; name: string };
export type Player = { kind: "board" | "member"; name: string } | null;

const KEY = "shpe-game-member";

export function getMember(): GameMember | null {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "null");
    return m?.email && m?.studentId && m?.name ? m : null;
  } catch {
    return null;
  }
}

export async function signInMember(email: string, studentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("member_login", {
    p_email: email.trim(),
    p_student_id: studentId.trim(),
  });
  if (error || !data) {
    return { ok: false as const, message: (error?.message ?? "Sign in failed").replace(/^.*?:\s*/, "") };
  }
  const m: GameMember = { email: email.trim(), studentId: studentId.trim(), name: String(data) };
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
  window.dispatchEvent(new Event("shpe-member-change"));
  return { ok: true as const, member: m };
}

export function signOutMember() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event("shpe-member-change"));
}

/** Who would a score be posted as right now? Board login wins over member login. */
export async function currentPlayer(): Promise<Player> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: me } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (me?.role === "admin") {
        return { kind: "board", name: (me.full_name || me.email.split("@")[0]).slice(0, 24) };
      }
    }
  } catch {}
  const m = getMember();
  return m ? { kind: "member", name: m.name } : null;
}
