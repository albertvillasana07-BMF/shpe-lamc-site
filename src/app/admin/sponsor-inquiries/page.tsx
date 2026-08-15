import { createClient } from "@/lib/supabase/server";
import type { SponsorInquiryRow } from "@/lib/types";

export default async function AdminSponsorInquiriesPage() {
  const supabase = await createClient();
  const { data: inquiries } = await supabase
    .from("sponsor_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (inquiries ?? []) as SponsorInquiryRow[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">Sponsor Inquiries</h1>
      <p className="mb-6 text-sm text-navy/60">
        Organizations that signed up through the &quot;Become a Sponsor&quot; page.
      </p>

      {rows.length === 0 ? (
        <p className="text-navy/60">No inquiries yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="font-bold text-navy">{r.organization}</p>
              <p className="text-sm text-navy/70">
                {r.contact_name} · {r.email} {r.phone ? `· ${r.phone}` : ""}
              </p>
              {r.message && <p className="mt-2 text-sm text-navy/60">{r.message}</p>}
              <p className="mt-2 text-xs text-navy/40">
                {new Date(r.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
