import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { SponsorRow } from "@/lib/types";

const TIER_ORDER = ["Diamond", "Platinum", "Gold", "Silver"] as const;

const TIER_STYLES: Record<string, { cols: string; logoHeight: string }> = {
  Diamond: { cols: "grid-cols-1 sm:grid-cols-2", logoHeight: "h-24" },
  Platinum: { cols: "grid-cols-2 sm:grid-cols-3", logoHeight: "h-20" },
  Gold: { cols: "grid-cols-2 sm:grid-cols-3", logoHeight: "h-16" },
  Silver: { cols: "grid-cols-3 sm:grid-cols-4", logoHeight: "h-12" },
};

function SponsorLogo({ s, heightClass }: { s: SponsorRow; heightClass: string }) {
  return (
    <a
      key={s.id}
      href={s.website_url ?? undefined}
      target={s.website_url ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm"
    >
      {s.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo_url} alt={s.name} className={`${heightClass} w-full object-contain`} />
      ) : (
        <div
          className={`flex ${heightClass} w-full items-center justify-center rounded bg-navy/5 font-bold text-navy`}
        >
          {s.name}
        </div>
      )}
      <p className="text-sm font-bold text-navy">{s.name}</p>
    </a>
  );
}

export default async function SponsorsPage() {
  const supabase = await createClient();
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (sponsors ?? []) as SponsorRow[];
  const tiered = TIER_ORDER.map((tier) => ({
    tier,
    sponsors: rows.filter((s) => s.tier === tier),
  })).filter((g) => g.sponsors.length > 0);
  const untiered = rows.filter((s) => !TIER_ORDER.includes(s.tier as (typeof TIER_ORDER)[number]));

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
            supporting SHPE LAMC? See below.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {tiered.map(({ tier, sponsors: group }) => (
              <div key={tier}>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-pink">
                  {tier}
                </p>
                <div className={`grid gap-4 ${TIER_STYLES[tier].cols}`}>
                  {group.map((s) => (
                    <SponsorLogo key={s.id} s={s} heightClass={TIER_STYLES[tier].logoHeight} />
                  ))}
                </div>
              </div>
            ))}

            {untiered.length > 0 && (
              <div>
                {tiered.length > 0 && (
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-pink">
                    Supporters
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {untiered.map((s) => (
                    <SponsorLogo key={s.id} s={s} heightClass="h-16" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-xl">Interested in becoming a sponsor?</h2>
          <p className="mb-5 text-sm text-navy/70">
            Partner with SHPE LAMC and support the next generation of engineers.
          </p>
          <Link
            href="/sponsors/apply"
            className="rounded-full bg-orange px-8 py-3 text-sm font-bold text-white shadow hover:opacity-90"
          >
            Sign Up as a Sponsor
          </Link>
        </div>
      </div>
    </div>
  );
}
