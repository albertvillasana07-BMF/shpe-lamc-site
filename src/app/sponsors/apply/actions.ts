"use server";

import { createClient } from "@/lib/supabase/server";
import { notifyBoard } from "@/lib/notify";

export async function submitSponsorInquiry(
  _prevState: { ok: boolean; error: string | null },
  formData: FormData
) {
  const organization = String(formData.get("organization") ?? "").trim();
  const contact_name = String(formData.get("contact_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;

  if (!organization || !contact_name || !email) {
    return { ok: false, error: "Please fill in organization, contact name, and email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_inquiries").insert({
    organization,
    contact_name,
    email,
    phone,
    message,
  });

  if (error) {
    return { ok: false, error: "Something went wrong — please try again." };
  }

  await notifyBoard(`Sponsor inquiry from ${organization}`, [
    "A company filled out the Become a Sponsor form.",
    "",
    `Organization: ${organization}`,
    `Contact: ${contact_name}`,
    `Email: ${email}`,
    `Phone: ${phone ?? "not given"}`,
    "",
    `Message: ${message ?? "(none)"}`,
  ]);

  return { ok: true, error: null };
}
