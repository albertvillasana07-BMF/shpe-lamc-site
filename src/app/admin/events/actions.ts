"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncLamcEvents } from "@/lib/lamcEvents";

function eventFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    event_date: String(formData.get("event_date") ?? "") || null,
    event_time: String(formData.get("event_time") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    bg_color: String(formData.get("bg_color") ?? "").trim() || null,
    link_url: String(formData.get("link_url") ?? "").trim() || null,
  };
}

function refresh() {
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("events").insert({ ...eventFields(formData), created_by: user?.id ?? null });
  refresh();
}

export async function updateEvent(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("events").update(eventFields(formData)).eq("id", String(formData.get("id")));
  refresh();
}

export async function deleteEvent(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", String(formData.get("id")));
  refresh();
}

/* ---------- Suggested events from lamission.edu ---------- */

export async function approveSuggestion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("events")
    .insert({ ...eventFields(formData), created_by: user?.id ?? null });

  if (!error) {
    await supabase
      .from("event_suggestions")
      .update({ status: "approved" })
      .eq("id", String(formData.get("suggestion_id")));
  }
  refresh();
}

export async function dismissSuggestion(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("event_suggestions")
    .update({ status: "dismissed" })
    .eq("id", String(formData.get("suggestion_id")));
  revalidatePath("/admin/events");
}

export async function checkLamcNow(
  _prev: { message: string | null },
  _formData: FormData
): Promise<{ message: string | null }> {
  const supabase = await createClient();
  // The button checks fewer pages than the weekly run so it finishes quickly
  const result = await syncLamcEvents(supabase, 8);
  revalidatePath("/admin/events");
  return { message: result.message };
}
