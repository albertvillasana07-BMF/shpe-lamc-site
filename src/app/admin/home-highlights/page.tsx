import { createClient } from "@/lib/supabase/server";
import type { HomeHighlightRow } from "@/lib/types";
import { createHighlight, deleteHighlight, updateHighlight } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const COLOR_OPTIONS = ["bg-orange", "bg-teal", "bg-pink", "bg-navy", "bg-gold"];

export default async function AdminHomeHighlightsPage() {
  const supabase = await createClient();
  const { data: highlights } = await supabase
    .from("home_highlights")
    .select("*")
    .order("sort_order", { ascending: true });

  const rows = (highlights ?? []) as HomeHighlightRow[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">
        Homepage &quot;Why Join&quot; Cards
      </h1>
      <p className="mb-6 text-sm text-navy/70">
        These are the highlight cards shown on the homepage. If you don&apos;t
        add any, the homepage falls back to its default set.
      </p>

      <form
        action={createHighlight}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <label className="text-sm font-semibold text-navy md:col-span-2">
          Card title (required)
          <input
            name="title"
            placeholder="Card title (e.g. Scholarships)"
            required
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy md:col-span-2">
          Short description
          <textarea
            name="body"
            placeholder="Short description"
            rows={2}
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy">
          Accent color
          <select
            name="color"
            defaultValue="bg-orange"
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace("bg-", "")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy">
          Display order (0 shows first)
          <input
            name="sort_order"
            type="number"
            placeholder="Order (0 = first)"
            className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
          />
        </label>
        <SubmitButton className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2" pendingText="Adding…" doneText="✓ Added">
Add Card
</SubmitButton>
      </form>

      <div className="flex flex-col gap-3">
        {rows.map((h) => (
          <details
            key={h.id}
            className="rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-navy">{h.title}</p>
            </summary>

            <form
              action={updateHighlight}
              className="mt-4 grid gap-3 border-t border-black/5 pt-4 md:grid-cols-2"
            >
              <input type="hidden" name="id" value={h.id} />
              <label className="text-sm font-semibold text-navy md:col-span-2">
                Card title (required)
                <input
                  name="title"
                  defaultValue={h.title}
                  required
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-navy md:col-span-2">
                Short description
                <textarea
                  name="body"
                  defaultValue={h.body ?? ""}
                  rows={2}
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-navy">
                Accent color
                <select
                  name="color"
                  defaultValue={h.color ?? "bg-orange"}
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("bg-", "")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-navy">
                Display order (0 shows first)
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={h.sort_order}
                  className="mt-1 w-full font-normal text-navy rounded-lg border px-3 py-2"
                />
              </label>
              <div className="flex gap-3 md:col-span-2">
                <SubmitButton className="w-fit rounded-full bg-navy px-6 py-2 text-sm font-bold text-white hover:opacity-90" pendingText="Saving…" doneText="✓ Saved">
Save changes
</SubmitButton>
              </div>
            </form>

            <form action={deleteHighlight} className="mt-3 border-t border-black/5 pt-3">
              <input type="hidden" name="id" value={h.id} />
              <button className="text-sm font-bold text-pink hover:underline">
                Delete card
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
