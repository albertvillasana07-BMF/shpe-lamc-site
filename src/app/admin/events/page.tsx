import { createClient } from "@/lib/supabase/server";
import type { EventRow, EventSuggestionRow } from "@/lib/types";
import ImageUploadField from "@/components/ImageUploadField";
import CheckLamcButton from "./CheckLamcButton";
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

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const [{ data: events }, { data: suggestions }] = await Promise.all([
    supabase.from("events").select("*").order("event_date", { ascending: true }),
    supabase
      .from("event_suggestions")
      .select("*")
      .eq("status", "pending")
      .order("event_date", { ascending: true }),
  ]);

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
        <p className="mb-4 mt-1 text-sm text-navy/80">
          Every Monday the site checks lamc.edu for STEM-related events.
          Nothing goes live until a board member approves it. Edit anything
          before approving.
        </p>
        <CheckLamcButton />

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
