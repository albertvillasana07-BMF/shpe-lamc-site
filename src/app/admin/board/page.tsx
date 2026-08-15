import { createClient } from "@/lib/supabase/server";
import type { BoardMemberRow } from "@/lib/types";
import { createBoardMember, deleteBoardMember, updateBoardMember } from "./actions";

export default async function AdminBoardPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("board_members")
    .select("*")
    .order("sort_order", { ascending: true });

  const rows = (members ?? []) as BoardMemberRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Board Members</h1>

      <form
        action={createBoardMember}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input
          name="full_name"
          placeholder="Full name"
          required
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="role"
          placeholder="Role (e.g. President)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <textarea
          name="about_me"
          placeholder="About me"
          rows={2}
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <input
          name="headshot_url"
          placeholder="Headshot image URL"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="linkedin_url"
          placeholder="LinkedIn URL"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="sort_order"
          type="number"
          placeholder="Order (0 = first)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <button className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2">
          Add Board Member
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {rows.map((m) => (
          <details
            key={m.id}
            className="rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{m.full_name}</p>
                <p className="text-sm text-navy/60">{m.role ?? "No role set"}</p>
              </div>
            </summary>

            <form
              action={updateBoardMember}
              className="mt-4 grid gap-3 border-t border-black/5 pt-4 md:grid-cols-2"
            >
              <input type="hidden" name="id" value={m.id} />
              <input
                name="full_name"
                defaultValue={m.full_name}
                required
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <input
                name="role"
                defaultValue={m.role ?? ""}
                placeholder="Role"
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <textarea
                name="about_me"
                defaultValue={m.about_me ?? ""}
                rows={2}
                className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
              />
              <input
                name="headshot_url"
                defaultValue={m.headshot_url ?? ""}
                placeholder="Headshot image URL"
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <input
                name="linkedin_url"
                defaultValue={m.linkedin_url ?? ""}
                placeholder="LinkedIn URL"
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <input
                name="sort_order"
                type="number"
                defaultValue={m.sort_order}
                className="rounded-lg border border-black/10 px-3 py-2"
              />
              <div className="flex gap-3 md:col-span-2">
                <button className="w-fit rounded-full bg-navy px-6 py-2 text-sm font-bold text-white hover:opacity-90">
                  Save changes
                </button>
              </div>
            </form>

            <form action={deleteBoardMember} className="mt-3 border-t border-black/5 pt-3">
              <input type="hidden" name="id" value={m.id} />
              <button className="text-sm font-bold text-pink hover:underline">
                Remove board member
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
