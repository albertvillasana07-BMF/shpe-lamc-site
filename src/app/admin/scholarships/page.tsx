import { createClient } from "@/lib/supabase/server";
import type { ScholarshipRow } from "@/lib/types";
import { createScholarship, deleteScholarship } from "./actions";

export default async function AdminScholarshipsPage() {
  const supabase = await createClient();
  const { data: scholarships } = await supabase
    .from("scholarships")
    .select("*")
    .order("deadline", { ascending: true });

  const rows = (scholarships ?? []) as ScholarshipRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Scholarships</h1>

      <form
        action={createScholarship}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input
          name="title"
          placeholder="Scholarship title"
          required
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <input
          name="deadline"
          type="date"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="link"
          placeholder="Application link"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <textarea
          name="description"
          placeholder="Description"
          rows={3}
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <button className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2">
          Add Scholarship
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {rows.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-bold text-navy">{s.title}</p>
              <p className="text-sm text-navy/60">{s.deadline ?? "No deadline"}</p>
            </div>
            <form action={deleteScholarship}>
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
