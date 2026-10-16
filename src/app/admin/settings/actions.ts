"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const FIELDS = [
  "chapter_email",
  "instagram_handle",
  "location",
  "hero_subtitle",
  "about_us",
  "hero_image_url",
  "hero_image_alt",
  "join_image_url",
  "join_image_alt",
  "story_text",
  "founder_image_url",
  "founder_image_alt",
  "builder_text",
  "builder_image_url",
  "builder_image_alt",
  "builder_signature",
  "mos_text",
  "mos_image_url",
  "mos_image_alt",
  "sis_text",
  "sis_image_url",
  "sis_image_alt",
] as const;

export async function updateSiteSettings(formData: FormData) {
  const supabase = await createClient();

  const update: Record<string, string | null> = {};
  for (const field of FIELDS) {
    update[field] = String(formData.get(field) ?? "").trim() || null;
  }

  await supabase.from("site_settings").update(update).eq("id", 1);

  revalidatePath("/admin/settings");
  // Contact info shows in the footer of every page, so refresh them all
  revalidatePath("/", "layout");
}
