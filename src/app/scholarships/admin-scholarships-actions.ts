"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createScholarship(formData: FormData) {
  const supabase = await createClient();

  await supabase.from("scholarships").insert({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    amount: String(formData.get("amount") ?? "").trim() || null,
    deadline: String(formData.get("deadline") ?? "") || null,
    link: String(formData.get("link") ?? "").trim() || null,
  });

  revalidatePath("/admin/scholarships");
  revalidatePath("/scholarships");
}

export async function updateScholarship(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("scholarships")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      amount: String(formData.get("amount") ?? "").trim() || null,
      deadline: String(formData.get("deadline") ?? "") || null,
      link: String(formData.get("link") ?? "").trim() || null,
    })
    .eq("id", String(formData.get("id")));

  revalidatePath("/admin/scholarships");
  revalidatePath("/scholarships");
}

export async function deleteScholarship(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("scholarships").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/scholarships");
  revalidatePath("/scholarships");
}
