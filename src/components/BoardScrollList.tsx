import type { BoardMemberRow } from "@/lib/types";
import SnapScrollList from "@/components/SnapScrollList";

export default function BoardScrollList({ rows }: { rows: BoardMemberRow[] }) {
  return (
    <SnapScrollList label="Board members, scrollable list" heightClass="h-[75vh]">
      {rows.map((m) => (
        <div
          key={m.id}
          className="flex gap-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <div className="h-40 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-navy/10">
            {m.headshot_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                loading="lazy"
                decoding="async"
                src={m.headshot_url}
                alt={`Headshot of ${m.full_name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-navy/70">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-lg text-orange">{m.full_name}</h3>
            {m.role && <p className="text-base font-semibold text-navy">{m.role}</p>}
            {m.about_me && <p className="mt-1 text-sm leading-snug text-navy/80">{m.about_me}</p>}
            {m.linkedin_url && (
              <a
                href={m.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm font-bold text-orange underline-offset-2 hover:underline"
              >
                LinkedIn
                <span className="sr-only"> profile for {m.full_name} (opens in a new tab)</span>
                <span aria-hidden="true"> →</span>
              </a>
            )}
          </div>
        </div>
      ))}
    </SnapScrollList>
  );
}
