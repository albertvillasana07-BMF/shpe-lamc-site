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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy/70">
          Everyone who signed up directly through the Join page ({rows.length} total).
        </p>
        {rows.length > 0 && (
          <a
            href="/admin/members/export"
            className="rounded-full bg-navy px-5 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Download members (spreadsheet)
          </a>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-navy/70">No sign-ups yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Members who signed up on the Join page</caption>
            <thead className="bg-navy/5 text-navy/70">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Name</th>
                <th scope="col" className="px-4 py-3 font-bold">Email</th>
                <th scope="col" className="px-4 py-3 font-bold">Student ID</th>
                <th scope="col" className="px-4 py-3 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-black/5">
                  <td className="px-4 py-3 font-semibold text-navy">{m.full_name}</td>
                  <td className="px-4 py-3 text-navy/70">{m.email}</td>
                  <td className="px-4 py-3 text-navy/70">{m.student_id ?? "—"}</td>
                  <td className="px-4 py-3 text-navy/70">
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
