"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("events").insert({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    event_date: String(formData.get("event_date") ?? "") || null,
    event_time: String(formData.get("event_time") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    created_by: user?.id ?? null,
  });

  revalidatePath("/admin/events");
  revalidatePath("/events");
}

export async function deleteEvent(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/events");
  revalidatePath("/events");
}
