"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteScore(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("game_scores").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/leaderboards");
}

export async function deleteName(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("game_scores").delete().ilike("player_name", String(formData.get("name")));
  revalidatePath("/admin/leaderboards");
}
