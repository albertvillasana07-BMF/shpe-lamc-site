"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/login/forgot-password?error=Enter your email address");
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get("origin") ?? `https://${headerList.get("host")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    redirect(`/login/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  // Always show the same success message, whether or not the email exists —
  // don't leak which emails have accounts.
  redirect("/login/forgot-password?sent=1");
}