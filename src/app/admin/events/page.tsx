import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";
import { createEvent, deleteEvent, updateEvent } from "./actions";

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  const rows = (events ?? []) as EventRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Events</h1>

      <form
        action={createEvent}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input
          name="title"
          placeholder="Event title"
          required
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <input
          name="event_date"
          type="date"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="event_time"
          placeholder="Time (e.g. 6:00 PM)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="location"
          placeholder="Location"
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <textarea
          name="description"
          placeholder="Description"
          rows={3}
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <input
          name="image_url"
          placeholder="Image URL (fills the card as a full background)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="bg_color"
          placeholder="Background color if no image (e.g. #1D9E75)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <button className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2">
          Add Event
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {rows.map((e) => (
          <details
            key={e.id}
            className="rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{e.title}</p>
                <p className="text-sm text-navy/60">
                  {e.event_date ?? "No date"} {e.event_time ? `· ${e.event_time}` : ""}{" "}
                  {e.location ? `· ${e.location}` : ""}
                </p>
              </div>
            </summary>

            <form
              action={updateEvent}
              className="mt-4 grid gap-3 border-t border-black/5 pt-4 md:grid-cols-2"
            >
              <input type="hidden" name="id" value={e.id} />
              <input
                name="title"
                defaultValue={e.title}
                required
                className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
              />
              <input
                name="event_date"
                type="date"
                defaultValue={e.event_date ?? ""}
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <input
                name="event_time"
                defaultValue={e.event_time ?? ""}
                placeholder="Time"
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <input
                name="location"
                defaultValue={e.location ?? ""}
                placeholder="Location"
                className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
              />
              <textarea
                name="description"
                defaultValue={e.description ?? ""}
                rows={3}
                className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
              />
              <input
                name="image_url"
                defaultValue={e.image_url ?? ""}
                placeholder="Image URL"
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <input
                name="bg_color"
                defaultValue={e.bg_color ?? ""}
                placeholder="Background color"
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <div className="flex gap-3 md:col-span-2">
                <button className="w-fit rounded-full bg-navy px-6 py-2 text-sm font-bold text-white hover:opacity-90">
                  Save changes
                </button>
              </div>
            </form>

            <form action={deleteEvent} className="mt-3 border-t border-black/5 pt-3">
              <input type="hidden" name="id" value={e.id} />
              <button className="text-sm font-bold text-pink hover:underline">
                Delete event
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
