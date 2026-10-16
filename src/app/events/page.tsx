import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { createPublicClient } from "@/lib/supabase/public";
import { todayInLA } from "@/lib/dates";
import { googleCalendarUrl } from "@/lib/eventCalendar";
import type { EventRow } from "@/lib/types";

// Cached and rebuilt at most every 60 minutes, or right away when an admin saves a change.
export const revalidate = 3600;


export const metadata: Metadata = { title: "Events" };

function formatDate(d: string | null) {
  return d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date TBA";
}

function EventCard({ e, past }: { e: EventRow; past?: boolean }) {
  const gcal = past ? null : googleCalendarUrl(e);

  return (
    <li
      className="on-dark relative overflow-hidden rounded-2xl shadow-sm"
      style={{ backgroundColor: e.image_url ? undefined : e.bg_color || "#001f5b" }}
    >
      {e.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={e.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          // Dark overlay keeps white text readable on any photo or color
          background: e.image_url
            ? "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.35))"
            : "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.3))",
        }}
      />
      <div className="relative flex min-h-[180px] flex-col justify-end p-6 text-white">
        <p className="mb-1 w-fit rounded-full bg-black/50 px-3 py-1 text-sm font-bold">
          {formatDate(e.event_date)}
          {e.event_time ? `, ${e.event_time}` : ""}
        </p>
        <h3 className="text-xl font-bold">{e.title}</h3>
        {e.location && <p className="text-sm font-semibold text-white">{e.location}</p>}
        {e.description && <p className="mt-2 max-w-2xl text-sm text-white">{e.description}</p>}

        {(gcal || e.link_url || (!past && e.event_date)) && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
            {gcal && (
              <a
                href={gcal}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline underline-offset-2"
              >
                Add to Google Calendar
                <span className="sr-only"> for {e.title} (opens in a new tab)</span>
              </a>
            )}
            {!past && e.event_date && (
              <a href={`/events/${e.id}/ics`} className="text-gold underline underline-offset-2">
                Add to Apple or Outlook calendar
                <span className="sr-only"> for {e.title}</span>
              </a>
            )}
            {e.link_url && (
              <a
                href={e.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline underline-offset-2"
              >
                More info<span className="sr-only"> about {e.title} (opens in a new tab)</span>
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default async function EventsPage() {
  const supabase = createPublicClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  const rows = (events ?? []) as EventRow[];
  const today = todayInLA();

  // Events with no date count as upcoming. Past events move down on their own.
  const upcoming = rows.filter((e) => !e.event_date || e.event_date >= today);
  const past = rows
    .filter((e) => e.event_date && e.event_date < today)
    .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));

  return (
    <div>
      <PageHeader title="Events" subtitle="Meetings, workshops, and outreach, all in one place." />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="mb-4 text-2xl text-navy">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-navy/80">
            No upcoming events posted yet. Check back soon, or follow our Instagram for updates.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {upcoming.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <details className="mt-12">
            <summary className="cursor-pointer text-lg font-bold text-navy">
              Past events ({past.length})
            </summary>
            <ul className="mt-4 flex flex-col gap-4">
              {past.map((e) => (
                <EventCard key={e.id} e={e} past />
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
