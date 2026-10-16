import type { ScholarshipRow } from "@/lib/types";
import SnapScrollList from "@/components/SnapScrollList";

function formatDeadline(deadline: string | null) {
  if (!deadline) return "Deadline: TBA";
  return `Deadline: ${new Date(deadline + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function ScholarshipScrollList({ rows }: { rows: ScholarshipRow[] }) {
  return (
    <SnapScrollList label="Scholarships, scrollable list" heightClass="h-[70vh]">
      {rows.map((s) => (
        <div key={s.id} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-navy">{s.title}</h2>
            {s.amount && <span className="text-base font-bold text-orange">{s.amount}</span>}
          </div>
          {s.description && <p className="mt-2 text-sm text-navy/80">{s.description}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-navy/80">
              <span aria-hidden="true">📅 </span>
              {formatDeadline(s.deadline)}
            </span>
            {s.link && (
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-orange underline-offset-2 hover:underline"
              >
                Apply<span className="sr-only"> for {s.title} (opens in a new tab)</span>
                <span aria-hidden="true"> →</span>
              </a>
            )}
          </div>
        </div>
      ))}
    </SnapScrollList>
  );
}
