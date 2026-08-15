import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";
import { updateSiteSettings } from "./actions";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const settings = data as SiteSettings | null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Chapter Contact Info</h1>

      <form
        action={updateSiteSettings}
        className="grid max-w-xl gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
      >
        <label className="text-sm font-semibold text-navy/70">
          Chapter email
          <input
            name="chapter_email"
            defaultValue={settings?.chapter_email ?? ""}
            placeholder="shpe@lamission.edu"
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy/70">
          Instagram handle
          <input
            name="instagram_handle"
            defaultValue={settings?.instagram_handle ?? ""}
            placeholder="@lamc.shpe"
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy/70">
          Location
          <input
            name="location"
            defaultValue={settings?.location ?? ""}
            placeholder="Los Angeles Mission College"
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
        <button className="mt-2 w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90">
          Save changes
        </button>
      </form>
    </div>
  );
}
