"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || password.length < 6) {
    redirect("/reset-password?error=Password must be at least 6 characters");
  }
  if (password !== confirm) {
    redirect("/reset-password?error=Passwords don't match");
  }

  const supabase = await createClient();

  // This only succeeds if the recovery-link session (set when the page
  // loaded) is still valid.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin?reset=1");
}