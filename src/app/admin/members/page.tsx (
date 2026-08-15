import { createClient } from "@/lib/supabase/server";
import type { MemberRow } from "@/lib/types";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (members ?? []) as MemberRow[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">Members</h1>
      <p className="mb-6 text-sm text-navy/60">
        Everyone who signed up directly through the Join page.
      </p>

      {rows.length === 0 ? (
        <p className="text-navy/60">No sign-ups yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy/5 text-navy/60">
              <tr>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Student ID</th>
                <th className="px-4 py-3 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-black/5">
                  <td className="px-4 py-3 font-semibold text-navy">{m.full_name}</td>
                  <td className="px-4 py-3 text-navy/70">{m.email}</td>
                  <td className="px-4 py-3 text-navy/70">{m.student_id ?? "—"}</td>
                  <td className="px-4 py-3 text-navy/50">
                    {new Date(m.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
