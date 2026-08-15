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

export async function transferOwnership(formData: FormData) {
  const newOwnerId = String(formData.get("id"));
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Make sure the new owner is an admin, hand them ownership,
  // then step the current owner down to a regular admin.
  await supabase
    .from("profiles")
    .update({ role: "admin", is_owner: true })
    .eq("id", newOwnerId);

  await supabase
    .from("profiles")
    .update({ is_owner: false })
    .eq("id", user.id);

  revalidatePath("/admin/approvals");
}
