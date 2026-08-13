"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveUser(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("profiles").update({ role: "admin" }).eq("id", id);
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}

export async function removeAdmin(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("profiles").update({ role: "pending" }).eq("id", id);
  revalidatePath("/admin/approvals");
}
