"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSiteSettings(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("site_settings")
    .update({
      chapter_email: String(formData.get("chapter_email") ?? "").trim() || null,
      instagram_handle: String(formData.get("instagram_handle") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      hero_subtitle: String(formData.get("hero_subtitle") ?? "").trim() || null,
      about_us: String(formData.get("about_us") ?? "").trim() || null,
    })
    .eq("id", 1);

  revalidatePath("/admin/settings");
  revalidatePath("/contact");
  revalidatePath("/");
}
