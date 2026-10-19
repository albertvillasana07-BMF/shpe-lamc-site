import { createClient } from "@/lib/supabase/server";
import type { EventRow, EventSuggestionRow } from "@/lib/types";
import ImageUploadField from "@/components/ImageUploadField";
import BookmarkletInstaller from "./BookmarkletInstaller";
import {
  approveSuggestion,
  createEvent,
  deleteEvent,
  dismissSuggestion,
  updateEvent,
} from "./actions";
import SubmitButton from "@/components/SubmitButton";

const input = "mt-1 w-full rounded-lg border px-3 py-2 font-normal text-navy";
const label = "text-sm font-semibold text-navy";

function EventFields({ e, idPrefix }: { e?: Partial<EventRow>; idPrefix: string }) {
  return (
    <>
      <label className={`${label} md:col-span-2`}>
        Event title (required)
        <input name="title" defaultValue={e?.title ?? ""} required className={input} />
      </label>
      <label className={label}>
        Date
        <input name="event_date" type="date" defaultValue={e?.event_date ?? ""} className={input} />
      </label>
      <label className={label}>
        Time
        <input
          name="event_time"
          defaultValue={e?.event_time ?? ""}
          placeholder="6:00 PM"
          className={input}
        />
      </label>
      <label className={`${label} md:col-span-2`}>
        Location
        <input name="location" defaultValue={e?.location ?? ""} className={input} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Description
        <textarea name="description" defaultValue={e?.description ?? ""} rows={3} className={input} />
      </label>
      <label className={`${label} md:col-span-2`}>
        &quot;More info&quot; link (optional)
        <input
          name="link_url"
          type="url"
          defaultValue={e?.link_url ?? ""}
          placeholder="https://"
          className={input}
        />
      </label>
      <ImageUploadField
        name="image_url"
        label="Event image"
        folder="events"
        defaultValue={e?.image_url}
        aspect={4 / 3}
        key={`${idPrefix}-img`}
      />
      <label className={label}>
        Background color if there&apos;s no image
        <span className="block text-xs font-normal text-navy/70">
          Pick a dark color so white text stays readable, e.g. #001F5B
        </span>
        <input name="bg_color" defaultValue={e?.bg_color ?? ""} placeholder="#001F5B" className={input} />
      </label>
    </>
  );
}

function daysAgo(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86_400_000);
}

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const [{ data: events }, { data: suggestions }, { data: settingsRow }] = await Promise.all([
    supabase.from("events").select("*").order("event_date", { ascending: true }),
    supabase
      .from("event_suggestions")
      .select("*")
      .eq("status", "pending")
      .order("event_date", { ascending: true }),
    supabase.from("site_settings").select("last_lamc_import").eq("id", 1).single(),
  ]);

  const lastImport = (settingsRow as { last_lamc_import: string | null } | null)?.last_lamc_import;
  const daysSince = daysAgo(lastImport);
  const due = daysSince === null || daysSince >= 7;

  const rows = (events ?? []) as EventRow[];
  const pending = (suggestions ?? []) as EventSuggestionRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Events</h1>

      {/* Suggested events from LAMC */}
      <section
        aria-labelledby="suggested-heading"
        className="mb-10 rounded-2xl border border-teal/30 bg-teal/5 p-6"
      >
        <h2 id="suggested-heading" className="text-lg text-navy">
          Suggested from LAMC ({pending.length})
        </h2>
        <p
          className={`mt-2 w-fit rounded-full px-3 py-1 text-sm font-bold ${
            due ? "bg-orange/10 text-orange" : "bg-teal/10 text-teal"
          }`}
        >
          {daysSince === null
            ? "No LAMC import yet"
            : daysSince === 0
              ? "Last LAMC import: today ✓"
              : `Last LAMC import: ${daysSince} day${daysSince === 1 ? "" : "s"} ago${due ? ", time for a new one" : " ✓"}`}
        </p>

        <h3 className="mt-5 text-base text-navy">Weekly: import LAMC events (10 seconds)</h3>
        <ol className="mb-4 ml-5 mt-1 list-decimal text-sm text-navy/80">
          <li>
            Open{" "}
            <a
              href="https://www.lamc.edu/campus-life/events"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange underline"
            >
              LAMC&apos;s events page<span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </li>
          <li>Click your <strong>📅 Send to SHPE</strong> bookmark.</li>
          <li>Approve the events you want below. Nothing goes live until you do.</li>
        </ol>

        <details className="rounded-xl bg-white p-4 text-sm" open={daysSince === null}>
          <summary className="cursor-pointer font-bold text-navy">
            First time? Set up the Send to SHPE bookmark
          </summary>
          <div className="mt-3">
            <BookmarkletInstaller />
          </div>
        </details>

        {pending.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3">
            {pending.map((s) => (
              <li key={s.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
                <details>
                  <summary className="cursor-pointer">
                    <span className="font-bold text-navy">{s.title}</span>
                    <span className="block text-sm text-navy/70">
                      {s.event_date ?? "No date"}
                      {s.event_time ? `, ${s.event_time}` : ""}
                      {s.location ? `, ${s.location}` : ""}
                    </span>
                  </summary>
                  <form
                    action={approveSuggestion}
                    className="mt-4 grid gap-3 border-t border-black/5 pt-4 md:grid-cols-2"
                  >
                    <input type="hidden" name="suggestion_id" value={s.id} />
                    <EventFields
                      idPrefix={s.id}
                      e={{
                        title: s.title,
                        description: s.description,
                        event_date: s.event_date,
                        event_time: s.event_time,
                        location: s.location,
                        link_url: s.source_url,
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                      <SubmitButton className="rounded-full bg-teal px-6 py-2 text-sm font-bold text-white hover:opacity-90" pendingText="Posting…" doneText="✓ Posted">
Approve and post
</SubmitButton>
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-navy underline underline-offset-2"
                      >
                        View on lamc.edu<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </div>
                  </form>
                </details>
                <form action={dismissSuggestion} className="mt-3 border-t border-black/5 pt-3">
                  <input type="hidden" name="suggestion_id" value={s.id} />
                  <button className="text-sm font-bold text-pink hover:underline">
                    Dismiss<span className="sr-only"> {s.title}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mb-3 text-lg text-navy">Add an event</h2>
      <form
        action={createEvent}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <EventFields idPrefix="new" />
        <SubmitButton className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2" pendingText="Adding…" doneText="✓ Added">
Add event
</SubmitButton>
      </form>

      <h2 className="mb-3 text-lg text-navy">Posted events</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((e) => (
          <li key={e.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <details>
              <summary className="cursor-pointer">
                <span className="font-bold text-navy">{e.title}</span>
                <span className="block text-sm text-navy/70">
                  {e.event_date ?? "No date"} {e.event_time ? `, ${e.event_time}` : ""}
                  {e.location ? `, ${e.location}` : ""}
                </span>
              </summary>

              <form
                action={updateEvent}
                className="mt-4 grid gap-3 border-t border-black/5 pt-4 md:grid-cols-2"
              >
                <input type="hidden" name="id" value={e.id} />
                <EventFields e={e} idPrefix={e.id} />
                <SubmitButton className="w-fit rounded-full bg-navy px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2" pendingText="Saving…" doneText="✓ Saved">
Save changes
</SubmitButton>
              </form>
            </details>

            <form action={deleteEvent} className="mt-3 border-t border-black/5 pt-3">
              <input type="hidden" name="id" value={e.id} />
              <button className="text-sm font-bold text-pink hover:underline">
                Delete event<span className="sr-only"> {e.title}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
