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

/* ---------- "Send to SHPE" bookmark import ---------- */

export type ImportedEvent = {
  u: string; // LAMC event link
  d: string; // date, YYYY-MM-DD
  t: string; // title
  desc?: string;
  time?: string;
  loc?: string;
};

const LAMC_EVENT_URL =
  /^https:\/\/www\.lamc\.edu\/campus-life\/events\/\d{4}\/\d{1,2}\/\d{1,2}\/[a-z0-9-]+$/i;

const cut = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim().slice(0, max) : null;

export async function importLamcEvents(
  events: ImportedEvent[]
): Promise<{ ok: true; found: number; added: number } | { ok: false; message: string }> {
  if (!Array.isArray(events)) return { ok: false, message: "No events received." };

  // Only accept real LAMC event links with valid dates
  const rows = events
    .slice(0, 100)
    .filter((e) => e && typeof e.u === "string" && LAMC_EVENT_URL.test(e.u) && /^\d{4}-\d{2}-\d{2}$/.test(e.d))
    .map((e) => ({
      title: cut(e.t, 160) ?? "LAMC event",
      event_date: e.d,
      source_url: e.u,
      description: cut(e.desc, 400),
      event_time: cut(e.time, 60),
      location: cut(e.loc, 140),
    }));

  if (rows.length === 0) return { ok: false, message: "None of those looked like LAMC event links." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_suggestions")
    .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return {
      ok: false,
      message: "Couldn't save the events. Make sure you're logged in as an admin, then try again.",
    };
  }

  await supabase
    .from("site_settings")
    .update({ last_lamc_import: new Date().toISOString() })
    .eq("id", 1);

  revalidatePath("/admin/events");
  return { ok: true, found: rows.length, added: data?.length ?? 0 };
}
