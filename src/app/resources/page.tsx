import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { ResourceRow } from "@/lib/types";

export default async function PublicResourcesPage() {
  const supabase = await createClient();

  // RLS already restricts anonymous/public visitors to rows where
  // is_public = true, but we filter explicitly too for clarity.
  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .eq("is_public", true)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  const rows = (resources ?? []) as ResourceRow[];

  const withLinks = await Promise.all(
    rows.map(async (r) => {
      if (!r.file_url) return { ...r, openUrl: null, downloadUrl: null };
      const [openSigned, downloadSigned] = await Promise.all([
        supabase.storage.from("resources").createSignedUrl(r.file_url, 3600),
        supabase.storage
          .from("resources")
          .createSignedUrl(r.file_url, 3600, { download: true }),
      ]);
      return {
        ...r,
        openUrl: openSigned.data?.signedUrl ?? null,
        downloadUrl: downloadSigned.data?.signedUrl ?? null,
      };
    })
  );

  const groups = new Map<string, typeof withLinks>();
  for (const r of withLinks) {
    const key = r.category?.trim() || "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return (
    <div>
      <PageHeader
        title="Resources"
        subtitle="Public documents and links from SHPE LAMC — open to everyone, no login required."
      />
      <div className="mx-auto max-w-4xl px-4 py-12">
        {withLinks.length === 0 ? (
          <p className="text-navy/60">
            No public resources are posted yet — check back soon.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {Array.from(groups.entries()).map(([category, items]) => (
              <div key={category}>
                <h2 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-pink">
                  {category}
                </h2>
                <div className="flex flex-col gap-3">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <p className="flex items-center gap-2 font-bold text-navy">
                          <span aria-hidden>📄</span>
                          {r.title}
                        </p>
                        {r.description && (
                          <p className="mt-1 text-sm text-navy/60">
                            {r.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-4">
                        {r.openUrl && (
                          
                            href={r.openUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-orange"
                          >
                            Open
                          </a>
                        )}
                        {r.downloadUrl && (
                          
                            href={r.downloadUrl}
                            className="text-sm font-semibold text-navy/70 hover:text-orange"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}