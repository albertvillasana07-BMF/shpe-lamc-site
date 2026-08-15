import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";
import ImageUploadField from "@/components/ImageUploadField";
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

        <div className="mt-2 border-t border-black/5 pt-4">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-pink">
            Homepage content
          </p>
        </div>
        <label className="text-sm font-semibold text-navy/70">
          Hero banner image
          <div className="mt-1">
            <ImageUploadField
              name="hero_image_url"
              label="Banner image (leave empty to keep the default)"
              folder="homepage"
              defaultValue={settings?.hero_image_url}
            />
          </div>
        </label>
        <label className="text-sm font-semibold text-navy/70">
          Hero subtitle
          <textarea
            name="hero_subtitle"
            defaultValue={settings?.hero_subtitle ?? ""}
            rows={2}
            placeholder="Engineering students at Los Angeles Mission College building community, mentorship, and career opportunities — together."
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-navy/70">
          About Us paragraph
          <textarea
            name="about_us"
            defaultValue={settings?.about_us ?? ""}
            rows={4}
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
