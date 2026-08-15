import { createClient } from "@/lib/supabase/server";
import type { SponsorRow } from "@/lib/types";
import { createSponsor, deleteSponsor } from "./actions";

export default async function AdminSponsorsPage() {
  const supabase = await createClient();
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (sponsors ?? []) as SponsorRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Sponsors</h1>

      <form
        action={createSponsor}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input
          name="name"
          placeholder="Company name"
          required
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <select
          name="tier"
          defaultValue=""
          className="rounded-lg border border-black/10 px-3 py-2"
        >
          <option value="">No tier</option>
          <option value="Diamond">Diamond</option>
          <option value="Platinum">Platinum</option>
          <option value="Gold">Gold</option>
          <option value="Silver">Silver</option>
        </select>
        <input
          name="website_url"
          placeholder="Website URL"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="logo_url"
          placeholder="Logo image URL (paste a link to their logo image)"
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <button className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2">
          Add Sponsor
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {rows.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-bold text-navy">
                {s.name} {s.tier && <span className="text-xs text-teal">({s.tier})</span>}
              </p>
              {s.website_url && (
                <p className="text-sm text-navy/60">{s.website_url}</p>
              )}
            </div>
            <form action={deleteSponsor}>
              <input type="hidden" name="id" value={s.id} />
              <button className="text-sm font-bold text-pink hover:underline">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
