"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addSlideshowPhoto(formData: FormData) {
  const supabase = await createClient();
  const image_url = String(formData.get("image_url") ?? "").trim();
  if (!image_url) return;

  await supabase.from("slideshow_photos").insert({
    image_url,
    caption: String(formData.get("caption") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });

  revalidatePath("/admin/slideshow");
  revalidatePath("/");
}

export async function deleteSlideshowPhoto(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("slideshow_photos")
    .delete()
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/slideshow");
  revalidatePath("/");
}
