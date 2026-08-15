import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { approveUser, removeAdmin, transferOwnership } from "./actions";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("is_owner")
    .eq("id", user!.id)
    .single();

  if (!me?.is_owner) redirect("/admin");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (profiles ?? []) as Profile[];
  const pending = rows.filter((p) => p.role === "pending");
  const admins = rows.filter((p) => p.role === "admin");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">Approvals</h1>
      <p className="mb-6 text-sm text-navy/60">
        &quot;Make Owner&quot; hands full ownership to that admin and steps you
        down to a regular admin — use this when you graduate or hand off the
        chapter to the next president.
      </p>

      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-pink">
        Pending ({pending.length})
      </h2>
      <div className="mb-10 flex flex-col gap-3">
        {pending.length === 0 && (
          <p className="text-sm text-navy/50">No one is waiting on approval.</p>
        )}
        {pending.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-bold text-navy">{p.full_name ?? "(no name)"}</p>
              <p className="text-sm text-navy/60">{p.email}</p>
            </div>
            <form action={approveUser}>
              <input type="hidden" name="id" value={p.id} />
              <button className="rounded-full bg-teal px-5 py-2 text-sm font-bold text-white hover:opacity-90">
                Approve as Admin
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-pink">
        Current Admins ({admins.length})
      </h2>
      <div className="flex flex-col gap-3">
        {admins.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-bold text-navy">
                {p.full_name ?? "(no name)"} {p.is_owner && (
                  <span className="ml-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-navy">
                    Owner
                  </span>
                )}
              </p>
              <p className="text-sm text-navy/60">{p.email}</p>
            </div>
            {!p.is_owner && (
              <div className="flex flex-wrap gap-2">
                <form action={transferOwnership}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded-full border-2 border-gold px-5 py-2 text-sm font-bold text-navy hover:bg-gold">
                    Make Owner
                  </button>
                </form>
                <form action={removeAdmin}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded-full border-2 border-pink px-5 py-2 text-sm font-bold text-pink hover:bg-pink hover:text-white">
                    Remove Access
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
