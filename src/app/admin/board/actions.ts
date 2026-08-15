"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createBoardMember(formData: FormData) {
  const supabase = await createClient();

  await supabase.from("board_members").insert({
    full_name: String(formData.get("full_name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim() || null,
    about_me: String(formData.get("about_me") ?? "").trim() || null,
    headshot_url: String(formData.get("headshot_url") ?? "").trim() || null,
    linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });

  revalidatePath("/admin/board");
  revalidatePath("/contact");
}

export async function updateBoardMember(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("board_members")
    .update({
      full_name: String(formData.get("full_name") ?? "").trim(),
      role: String(formData.get("role") ?? "").trim() || null,
      about_me: String(formData.get("about_me") ?? "").trim() || null,
      headshot_url: String(formData.get("headshot_url") ?? "").trim() || null,
      linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    })
    .eq("id", String(formData.get("id")));

  revalidatePath("/admin/board");
  revalidatePath("/contact");
}

export async function deleteBoardMember(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("board_members").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/board");
  revalidatePath("/contact");
}
