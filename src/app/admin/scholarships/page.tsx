import { createClient } from "@/lib/supabase/server";
import type { ScholarshipRow } from "@/lib/types";
import { todayInLA } from "@/lib/dates";
import { createScholarship, deleteScholarship, updateScholarship } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function AdminScholarshipsPage() {
  const supabase = await createClient();
  const { data: scholarships } = await supabase
    .from("scholarships")
    .select("*")
    .order("deadline", { ascending: true });

  const rows = (scholarships ?? []) as ScholarshipRow[];
  const today = todayInLA();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Scholarships</h1>

      <form
        action={createScholarship}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <label className="text-sm font-semibold text-navy md:col-span-2">
          Scholarship title (required)
          <input
            name="title"
            placeholder="Scholarship title"
            required
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy">
          Amount
          <input
            name="amount"
            placeholder="Amount (e.g. $2,500)"
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy">
          Deadline
          <input
            name="deadline"
            type="date"
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy md:col-span-2">
          Description
          <textarea
            name="description"
            placeholder="Description"
            rows={3}
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy md:col-span-2">
          Application link
          <input
            name="link"
            placeholder="Application link (URL)"
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <SubmitButton className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2" pendingText="Adding…" doneText="✓ Added">
Add Scholarship
</SubmitButton>
      </form>

      <div className="flex flex-col gap-3">
        {rows.map((s) => (
          <details
            key={s.id}
            className="rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-navy">
                  {s.title} {s.amount && <span className="text-xs text-teal">({s.amount})</span>}
                </p>
                <p className="text-sm text-navy/70">
                  {s.deadline ? `Deadline: ${s.deadline}` : "No deadline"}
                  {s.deadline && s.deadline < today && (
                    <span className="ml-2 rounded-full bg-navy/10 px-2 py-0.5 text-xs font-bold text-navy">
                      Expired, hidden from the public page
                    </span>
                  )}
                </p>
              </div>
            </summary>

            <form
              action={updateScholarship}
              className="mt-4 grid gap-3 border-t border-black/5 pt-4 md:grid-cols-2"
            >
              <input type="hidden" name="id" value={s.id} />
              <label className="text-sm font-semibold text-navy md:col-span-2">
                Scholarship title (required)
                <input
                  name="title"
                  defaultValue={s.title}
                  required
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-navy">
                Amount
                <input
                  name="amount"
                  defaultValue={s.amount ?? ""}
                  placeholder="Amount"
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-navy">
                Deadline
                <input
                  name="deadline"
                  type="date"
                  defaultValue={s.deadline ?? ""}
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-navy md:col-span-2">
                Description
                <textarea
                  name="description"
                  defaultValue={s.description ?? ""}
                  rows={3}
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-navy md:col-span-2">
                Application link
                <input
                  name="link"
                  defaultValue={s.link ?? ""}
                  placeholder="Application link"
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <div className="flex gap-3 md:col-span-2">
                <SubmitButton className="w-fit rounded-full bg-navy px-6 py-2 text-sm font-bold text-white hover:opacity-90" pendingText="Saving…" doneText="✓ Saved">
Save changes
</SubmitButton>
              </div>
            </form>

            <form action={deleteScholarship} className="mt-3 border-t border-black/5 pt-3">
              <input type="hidden" name="id" value={s.id} />
              <button className="text-sm font-bold text-pink hover:underline">
                Delete scholarship
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
