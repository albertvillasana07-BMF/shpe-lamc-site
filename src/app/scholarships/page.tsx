import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { ScholarshipRow } from "@/lib/types";

export default async function ScholarshipsPage() {
  const supabase = await createClient();
  const { data: scholarships } = await supabase
    .from("scholarships")
    .select("*")
    .order("deadline", { ascending: true });

  const rows = (scholarships ?? []) as ScholarshipRow[];

  return (
    <div>
      <PageHeader
        title="Scholarship Resources"
        subtitle="Opportunities for engineering and STEM students."
      />
      <div className="mx-auto max-w-4xl px-4 py-12">
        {rows.length === 0 ? (
          <p className="text-navy/60">
            No scholarships posted yet — check back soon.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-navy">{s.title}</h2>
                  {s.deadline && (
                    <span className="rounded-full bg-pink/10 px-3 py-1 text-xs font-bold text-pink">
                      Deadline:{" "}
                      {new Date(s.deadline + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="mt-2 text-sm text-navy/80">{s.description}</p>
                )}
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-bold text-orange"
                  >
                    Learn more →
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
