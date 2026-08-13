import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  const rows = (events ?? []) as EventRow[];

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Meetings, workshops, and outreach — all in one place."
      />
      <div className="mx-auto max-w-4xl px-4 py-12">
        {rows.length === 0 ? (
          <p className="text-navy/60">
            No events posted yet — check back soon, or follow our Instagram for updates.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-navy">{e.title}</h2>
                  <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-bold text-orange">
                    {e.event_date
                      ? new Date(e.event_date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )
                      : "Date TBA"}
                    {e.event_time ? ` · ${e.event_time}` : ""}
                  </span>
                </div>
                {e.location && (
                  <p className="mt-1 text-sm font-semibold text-teal">{e.location}</p>
                )}
                {e.description && (
                  <p className="mt-2 text-sm text-navy/80">{e.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
