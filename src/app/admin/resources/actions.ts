"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadResource(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!file || file.size === 0 || !title) {
    return;
  }

  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("resources")
    .upload(path, file);

  if (uploadError) {
    return;
  }

  await supabase.from("resources").insert({
    title,
    description,
    category,
    file_url: path,
    created_by: user?.id ?? null,
  });

  revalidatePath("/admin/resources");
}

export async function deleteResource(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const path = String(formData.get("path"));

  if (path) {
    await supabase.storage.from("resources").remove([path]);
  }
  await supabase.from("resources").delete().eq("id", id);

  revalidatePath("/admin/resources");
}
