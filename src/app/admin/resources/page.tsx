import { createClient } from "@/lib/supabase/server";
import type { ResourceRow } from "@/lib/types";
import { uploadResource, deleteResource } from "./actions";

export default async function AdminResourcesPage() {
  const supabase = await createClient();
  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (resources ?? []) as ResourceRow[];

  const withLinks = await Promise.all(
    rows.map(async (r) => {
      if (!r.file_url) return { ...r, signedUrl: null };
      const { data } = await supabase.storage
        .from("resources")
        .createSignedUrl(r.file_url, 60 * 60); // 1 hour
      return { ...r, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">Resource Library</h1>
      <p className="mb-6 text-sm text-navy/60">
        Files here are only visible to approved board members — this is your
        internal document library.
      </p>

      <form
        action={uploadResource}
        encType="multipart/form-data"
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input
          name="title"
          placeholder="Document title"
          required
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <input
          name="category"
          placeholder="Category (e.g. Meeting Notes, Bylaws)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="file"
          type="file"
          required
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <textarea
          name="description"
          placeholder="Description"
          rows={2}
          className="rounded-lg border border-black/10 px-3 py-2 md:col-span-2"
        />
        <button className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90 md:col-span-2">
          Upload
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {withLinks.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-bold text-navy">
                {r.title} {r.category && <span className="text-xs text-teal">({r.category})</span>}
              </p>
              {r.signedUrl && (
                <a
                  href={r.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-orange"
                >
                  Download / View
                </a>
              )}
            </div>
            <form action={deleteResource}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="path" value={r.file_url ?? ""} />
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
