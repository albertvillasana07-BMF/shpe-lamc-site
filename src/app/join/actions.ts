"use server";

import { createClient } from "@/lib/supabase/server";

export async function signupMember(
  _prevState: { ok: boolean; error: string | null },
  formData: FormData
) {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const student_id = String(formData.get("student_id") ?? "").trim() || null;

  if (!full_name || !email) {
    return { ok: false, error: "Please enter your name and email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert({
    full_name,
    email,
    student_id,
  });

  if (error) {
    return { ok: false, error: "Something went wrong — please try again." };
  }

  return { ok: true, error: null };
}
