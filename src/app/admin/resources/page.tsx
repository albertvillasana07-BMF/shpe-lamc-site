import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ResourceFolderRow, ResourceRow } from "@/lib/types";
import {
  createFolder,
  deleteFolder,
  deleteResource,
  renameFolder,
  renameResource,
  toggleResourcePublic,
  uploadResource,
} from "./actions";

async function getBreadcrumbs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folderId: string | null
) {
  const trail: ResourceFolderRow[] = [];
  let currentId = folderId;

  // Bounded loop — resource libraries won't realistically nest 25+ deep,
  // this just guards against an accidental cycle.
  for (let i = 0; i < 25 && currentId; i++) {
    const { data: folder } = await supabase
      .from("resource_folders")
      .select("*")
      .eq("id", currentId)
      .single();

    if (!folder) break;
    trail.unshift(folder as ResourceFolderRow);
    currentId = (folder as ResourceFolderRow).parent_id;
  }

  return trail;
}

export default async function AdminResourcesPage({
  searchParams,
}: PageProps<"/admin/resources">) {
  const params = await searchParams;
  const folderId =
    typeof params.folder === "string" && params.folder.trim().length > 0
      ? params.folder
      : null;

  const supabase = await createClient();

  const [{ data: folders }, { data: resources }, breadcrumbs] =
    await Promise.all([
      folderId
        ? supabase
            .from("resource_folders")
            .select("*")
            .eq("parent_id", folderId)
            .order("name")
        : supabase
            .from("resource_folders")
            .select("*")
            .is("parent_id", null)
            .order("name"),
      folderId
        ? supabase
            .from("resources")
            .select("*")
            .eq("folder_id", folderId)
            .order("title")
        : supabase
            .from("resources")
            .select("*")
            .is("folder_id", null)
            .order("title"),
      getBreadcrumbs(supabase, folderId),
    ]);

  const folderRows = (folders ?? []) as ResourceFolderRow[];
  const fileRows = (resources ?? []) as ResourceRow[];

  const withLinks = await Promise.all(
    fileRows.map(async (r) => {
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

  const currentFolder = breadcrumbs[breadcrumbs.length - 1] ?? null;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">Resource Library</h1>
      <p className="mb-4 text-sm text-navy/60">
        Files here are only visible to approved board members — this is your
        internal document library.
      </p>

      {/* Breadcrumbs */}
      <div className="mb-6 flex flex-wrap items-center gap-1 text-sm font-semibold text-navy/70">
        <Link href="/admin/resources" className="hover:text-orange">
          Resource Library
        </Link>
        {breadcrumbs.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="text-navy/30">/</span>
            <Link
              href={`/admin/resources?folder=${f.id}`}
              className="hover:text-orange"
            >
              {f.name}
            </Link>
          </span>
        ))}
      </div>

      {/* New folder + upload */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <form
          action={createFolder}
          className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-extrabold uppercase tracking-widest text-pink">
            New Folder
          </p>
          <input type="hidden" name="parent_id" value={folderId ?? ""} />
          <input
            name="name"
            placeholder="Folder name"
            required
            className="rounded-lg border border-black/10 px-3 py-2"
          />
          <button className="w-fit rounded-full bg-teal px-6 py-2 text-sm font-bold text-white hover:opacity-90">
            Create Folder
          </button>
        </form>

        <form
          action={uploadResource}
          encType="multipart/form-data"
          className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-extrabold uppercase tracking-widest text-pink">
            Upload File{currentFolder ? ` to "${currentFolder.name}"` : ""}
          </p>
          <input type="hidden" name="folder_id" value={folderId ?? ""} />
          <input
            name="title"
            placeholder="Document title"
            required
            className="rounded-lg border border-black/10 px-3 py-2"
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
            className="rounded-lg border border-black/10 px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-navy/80">
            <input type="checkbox" name="is_public" className="h-4 w-4" />
            Make public (visible to anyone on the public Resources page, no
            login required)
          </label>
          <button className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90">
            Upload
          </button>
        </form>
      </div>

      {/* Folders */}
      {folderRows.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {folderRows.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <Link
                href={`/admin/resources?folder=${f.id}`}
                className="flex items-center gap-2 font-bold text-navy hover:text-orange"
              >
                <span aria-hidden>📁</span> {f.name}
              </Link>
              <div className="flex items-center gap-4">
                <details className="relative">
                  <summary className="cursor-pointer text-sm font-bold text-teal hover:underline">
                    Rename
                  </summary>
                  <form
                    action={renameFolder}
                    className="mt-2 flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={f.id} />
                    <input
                      type="hidden"
                      name="parent_id"
                      value={folderId ?? ""}
                    />
                    <input
                      name="name"
                      defaultValue={f.name}
                      required
                      className="rounded-lg border border-black/10 px-2 py-1 text-sm"
                    />
                    <button className="rounded-full bg-teal px-4 py-1 text-xs font-bold text-white hover:opacity-90">
                      Save
                    </button>
                  </form>
                </details>
                <details>
                  <summary className="cursor-pointer text-sm font-bold text-pink hover:underline">
                    Delete
                  </summary>
                  <form action={deleteFolder} className="mt-2">
                    <input type="hidden" name="id" value={f.id} />
                    <input
                      type="hidden"
                      name="parent_id"
                      value={folderId ?? ""}
                    />
                    <p className="mb-2 text-xs text-navy/60">
                      Deletes everything inside this folder too. Sure?
                    </p>
                    <button className="rounded-full bg-pink px-4 py-1 text-xs font-bold text-white hover:opacity-90">
                      Confirm Delete
                    </button>
                  </form>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Files */}
      <div className="flex flex-col gap-3">
        {withLinks.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="flex items-center gap-2 font-bold text-navy">
                <span aria-hidden>📄</span>
                {r.title}{" "}
                {r.category && (
                  <span className="text-xs font-normal text-teal">
                    ({r.category})
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                    r.is_public
                      ? "bg-teal/15 text-teal"
                      : "bg-navy/10 text-navy/50"
                  }`}
                >
                  {r.is_public ? "Public" : "Private"}
                </span>
              </p>
              <div className="mt-1 flex gap-4">
                {r.openUrl && (
                  <a href={r.openUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-orange">
                    Open
                  </a>
                )}
                {r.downloadUrl && (
                  <a href={r.downloadUrl} className="text-sm font-semibold text-navy/70 hover:text-orange">
                    Download
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <form action={toggleResourcePublic}>
                <input type="hidden" name="id" value={r.id} />
                <input
                  type="hidden"
                  name="make_public"
                  value={r.is_public ? "false" : "true"}
                />
                <input type="hidden" name="folder_id" value={folderId ?? ""} />
                <button className="text-sm font-bold text-navy/70 hover:underline">
                  {r.is_public ? "Make Private" : "Make Public"}
                </button>
              </form>
              <details>
                <summary className="cursor-pointer text-sm font-bold text-teal hover:underline">
                  Rename
                </summary>
                <form
                  action={renameResource}
                  className="mt-2 flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="folder_id" value={folderId ?? ""} />
                  <input
                    name="title"
                    defaultValue={r.title}
                    required
                    className="rounded-lg border border-black/10 px-2 py-1 text-sm"
                  />
                  <button className="rounded-full bg-teal px-4 py-1 text-xs font-bold text-white hover:opacity-90">
                    Save
                  </button>
                </form>
              </details>
              <form action={deleteResource}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="path" value={r.file_url ?? ""} />
                <button className="text-sm font-bold text-pink hover:underline">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {folderRows.length === 0 && withLinks.length === 0 && (
          <p className="text-sm text-navy/50">
            This folder is empty — create a subfolder or upload a file above.
          </p>
        )}
      </div>
    </div>
  );
}