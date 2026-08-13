"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password || !fullName) {
    redirect("/signup?error=Fill in your name, email, and password");
  }
  if (password.length < 6) {
    redirect("/signup?error=Password must be at least 6 characters");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is off in the Supabase project, we get a session
  // immediately and the profile row (role: pending) already exists via the
  // handle_new_user trigger — send them to the waiting screen.
  if (data.session) {
    redirect("/pending");
  }

  // Otherwise Supabase requires confirming via email first.
  redirect("/login?error=Check your email to confirm your account, then log in");
}
