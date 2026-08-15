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
            {rows.map((e) => {
              const dateLabel = e.event_date
                ? new Date(e.event_date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Date TBA";

              return (
                <li
                  key={e.id}
                  className="relative overflow-hidden rounded-2xl shadow-sm"
                  style={{
                    backgroundColor: e.image_url ? undefined : e.bg_color || "#0f2340",
                  }}
                >
                  {e.image_url && (
                    <img
                      src={e.image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: e.image_url
                        ? "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.05))"
                        : "linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0))",
                    }}
                  />
                  <div className="relative flex min-h-[180px] flex-col justify-end p-6 text-white">
                    <span className="mb-1 w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                      {dateLabel}
                      {e.event_time ? ` · ${e.event_time}` : ""}
                    </span>
                    <h2 className="text-xl font-bold">{e.title}</h2>
                    {e.location && (
                      <p className="text-sm font-semibold text-white/85">{e.location}</p>
                    )}
                    {e.description && (
                      <p className="mt-2 max-w-2xl text-sm text-white/85">
                        {e.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
