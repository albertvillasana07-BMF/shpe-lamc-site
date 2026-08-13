import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { SponsorRow } from "@/lib/types";

export default async function SponsorsPage() {
  const supabase = await createClient();
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (sponsors ?? []) as SponsorRow[];

  return (
    <div>
      <PageHeader
        title="Sponsors & Partners"
        subtitle="Thank you to the companies supporting SHPE LAMC."
      />
      <div className="mx-auto max-w-5xl px-4 py-12">
        {rows.length === 0 ? (
          <p className="text-navy/60">
            We&apos;re building our sponsor list for this year — interested in
            supporting SHPE LAMC?{" "}
            <a href="/contact" className="font-bold text-orange">
              Get in touch
            </a>
            .
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {rows.map((s) => (
              <a
                key={s.id}
                href={s.website_url ?? undefined}
                target={s.website_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm"
              >
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logo_url}
                    alt={s.name}
                    className="h-16 w-full object-contain"
                  />
                ) : (
                  <div className="flex h-16 w-full items-center justify-center rounded bg-navy/5 font-bold text-navy">
                    {s.name}
                  </div>
                )}
                <div>
                  <p className="font-bold text-navy">{s.name}</p>
                  {s.tier && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal">
                      {s.tier}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
