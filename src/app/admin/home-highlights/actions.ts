"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createHighlight(formData: FormData) {
  const supabase = await createClient();

  await supabase.from("home_highlights").insert({
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim() || null,
    color: String(formData.get("color") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });

  revalidatePath("/admin/home-highlights");
  revalidatePath("/");
}

export async function updateHighlight(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("home_highlights")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      body: String(formData.get("body") ?? "").trim() || null,
      color: String(formData.get("color") ?? "").trim() || null,
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    })
    .eq("id", String(formData.get("id")));

  revalidatePath("/admin/home-highlights");
  revalidatePath("/");
}

export async function deleteHighlight(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("home_highlights").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/home-highlights");
  revalidatePath("/");
}
