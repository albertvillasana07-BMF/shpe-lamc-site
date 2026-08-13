"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSponsor(formData: FormData) {
  const supabase = await createClient();

  await supabase.from("sponsors").insert({
    name: String(formData.get("name") ?? "").trim(),
    tier: String(formData.get("tier") ?? "").trim() || null,
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    website_url: String(formData.get("website_url") ?? "").trim() || null,
  });

  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
}

export async function deleteSponsor(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("sponsors").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
}
