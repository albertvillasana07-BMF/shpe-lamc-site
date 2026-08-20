"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeFolderId(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function createFolder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = String(formData.get("name") ?? "").trim();
  const parentId = normalizeFolderId(formData.get("parent_id"));

  if (!name) return;

  await supabase.from("resource_folders").insert({
    name,
    parent_id: parentId,
    created_by: user?.id ?? null,
  });

  revalidatePath("/admin/resources");
}

export async function renameFolder(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const parentId = normalizeFolderId(formData.get("parent_id"));

  if (!id || !name) return;

  await supabase.from("resource_folders").update({ name }).eq("id", id);

  revalidatePath("/admin/resources");
  if (parentId) redirect(`/admin/resources?folder=${parentId}`);
  redirect("/admin/resources");
}

// Recursively collects every descendant folder id (including the folder
// itself) so we can clean up storage objects and rows top to bottom.
async function collectFolderTree(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rootId: string
): Promise<string[]> {
  const all = [rootId];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const { data: children } = await supabase
      .from("resource_folders")
      .select("id")
      .in("parent_id", frontier);

    const childIds = (children ?? []).map((c) => c.id as string);
    if (childIds.length === 0) break;

    all.push(...childIds);
    frontier = childIds;
  }

  return all;
}

export async function deleteFolder(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const parentId = normalizeFolderId(formData.get("parent_id"));

  if (!id) return;

  const folderIds = await collectFolderTree(supabase, id);

  const { data: filesToDelete } = await supabase
    .from("resources")
    .select("file_url")
    .in("folder_id", folderIds);

  const paths = (filesToDelete ?? [])
    .map((f) => f.file_url)
    .filter((p): p is string => !!p);

  if (paths.length > 0) {
    await supabase.storage.from("resources").remove(paths);
  }

  // Deleting the root folder cascades to child folders and resource rows
  // (both have `on delete cascade` foreign keys).
  await supabase.from("resource_folders").delete().eq("id", id);

  revalidatePath("/admin/resources");
  if (parentId) redirect(`/admin/resources?folder=${parentId}`);
  redirect("/admin/resources");
}

export async function uploadResource(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const folderId = normalizeFolderId(formData.get("folder_id"));
  const isPublic = formData.get("is_public") === "on";

  if (!file || file.size === 0 || !title) {
    return;
  }

  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("resources")
    .upload(path, file);

  if (uploadError) {
    return;
  }

  await supabase.from("resources").insert({
    title,
    description,
    category,
    file_url: path,
    folder_id: folderId,
    is_public: isPublic,
    created_by: user?.id ?? null,
  });

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}

export async function toggleResourcePublic(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const makePublic = formData.get("make_public") === "true";
  const folderId = normalizeFolderId(formData.get("folder_id"));

  if (!id) return;

  await supabase.from("resources").update({ is_public: makePublic }).eq("id", id);

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  if (folderId) redirect(`/admin/resources?folder=${folderId}`);
  redirect("/admin/resources");
}

export async function renameResource(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const folderId = normalizeFolderId(formData.get("folder_id"));

  if (!id || !title) return;

  await supabase.from("resources").update({ title }).eq("id", id);

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  if (folderId) redirect(`/admin/resources?folder=${folderId}`);
  redirect("/admin/resources");
}

export async function deleteResource(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const path = String(formData.get("path"));

  if (path) {
    await supabase.storage.from("resources").remove([path]);
  }
  await supabase.from("resources").delete().eq("id", id);

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}