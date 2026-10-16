import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";
import ImageUploadField from "@/components/ImageUploadField";
import {
  DEFAULT_BUILDER_SIGNATURE,
  DEFAULT_BUILDER_TEXT,
  DEFAULT_MOS_TEXT,
  DEFAULT_SIS_TEXT,
  DEFAULT_STORY_TEXT,
} from "@/components/OurStory";
import { updateSiteSettings } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const input = "mt-1 w-full rounded-lg border px-3 py-2 font-normal text-navy";
const labelCls = "text-sm font-semibold text-navy";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg text-navy">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  const s = data as SiteSettings | null;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">Site Content</h1>
      <p className="mb-6 text-sm text-navy/70">
        Contact info, homepage text, the Our Story section, and page photos.
        Leave a box empty to use the default text.
      </p>

      <form action={updateSiteSettings} className="grid max-w-2xl gap-6">
        <Section title="Contact info">
          <label className={labelCls}>
            Chapter email
            <input
              name="chapter_email"
              type="email"
              defaultValue={s?.chapter_email ?? ""}
              placeholder="shpe@lamission.edu"
              className={input}
            />
          </label>
          <label className={labelCls}>
            Instagram handle
            <input
              name="instagram_handle"
              defaultValue={s?.instagram_handle ?? ""}
              placeholder="@lamc.shpe"
              className={input}
            />
          </label>
          <label className={labelCls}>
            Location
            <input
              name="location"
              defaultValue={s?.location ?? ""}
              placeholder="Los Angeles Mission College"
              className={input}
            />
          </label>
        </Section>

        <Section title="Homepage">
          <ImageUploadField
            name="hero_image_url"
            label="Banner image"
            folder="homepage"
            defaultValue={s?.hero_image_url}
            aspect={16 / 9}
            altName="hero_image_alt"
            altDefault={s?.hero_image_alt}
          />
          <p className="-mt-2 text-xs text-navy/70">
            If the banner has words in it, type those words into the photo
            description so screen reader users get the same message.
          </p>
          <label className={labelCls}>
            Text under the banner
            <textarea
              name="hero_subtitle"
              defaultValue={s?.hero_subtitle ?? ""}
              rows={2}
              className={input}
            />
          </label>
          <label className={labelCls}>
            About Us paragraph
            <textarea name="about_us" defaultValue={s?.about_us ?? ""} rows={4} className={input} />
          </label>
        </Section>

        <Section title="Our Story">
          <label className={labelCls}>
            Story text
            <span className="block text-xs font-normal text-navy/70">
              Leave a blank line between paragraphs.
            </span>
            <textarea
              name="story_text"
              defaultValue={s?.story_text ?? ""}
              placeholder={DEFAULT_STORY_TEXT}
              rows={9}
              className={input}
            />
          </label>
          <ImageUploadField
            name="founder_image_url"
            label="Vincent Esparza's photo"
            folder="story"
            defaultValue={s?.founder_image_url}
            aspect={4 / 5}
            altName="founder_image_alt"
            altDefault={s?.founder_image_alt}
          />

          <label className={labelCls}>
            Magic of Science description
            <textarea
              name="mos_text"
              defaultValue={s?.mos_text ?? ""}
              placeholder={DEFAULT_MOS_TEXT}
              rows={2}
              className={input}
            />
          </label>
          <ImageUploadField
            name="mos_image_url"
            label="Magic of Science photo"
            folder="story"
            defaultValue={s?.mos_image_url}
            aspect={16 / 9}
            altName="mos_image_alt"
            altDefault={s?.mos_image_alt}
          />

          <label className={labelCls}>
            Spring into STEM description
            <textarea
              name="sis_text"
              defaultValue={s?.sis_text ?? ""}
              placeholder={DEFAULT_SIS_TEXT}
              rows={2}
              className={input}
            />
          </label>
          <ImageUploadField
            name="sis_image_url"
            label="Spring into STEM photo"
            folder="story"
            defaultValue={s?.sis_image_url}
            aspect={16 / 9}
            altName="sis_image_alt"
            altDefault={s?.sis_image_alt}
          />

          <label className={labelCls}>
            &quot;Built for the chapters that come next&quot; text
            <span className="block text-xs font-normal text-navy/70">
              Leave a blank line between paragraphs.
            </span>
            <textarea
              name="builder_text"
              defaultValue={s?.builder_text ?? ""}
              placeholder={DEFAULT_BUILDER_TEXT}
              rows={6}
              className={input}
            />
          </label>
          <label className={labelCls}>
            Name line under that text
            <input
              name="builder_signature"
              defaultValue={s?.builder_signature ?? ""}
              placeholder={DEFAULT_BUILDER_SIGNATURE}
              className={input}
            />
          </label>
          <ImageUploadField
            name="builder_image_url"
            label="Site builder's photo"
            folder="story"
            defaultValue={s?.builder_image_url}
            aspect={1}
            cropShape="round"
            altName="builder_image_alt"
            altDefault={s?.builder_image_alt}
          />
        </Section>

        <Section title="Join page">
          <ImageUploadField
            name="join_image_url"
            label="Join page photo"
            folder="join"
            defaultValue={s?.join_image_url}
            aspect={4 / 5}
            altName="join_image_alt"
            altDefault={s?.join_image_alt}
          />
        </Section>

        <SubmitButton className="w-fit rounded-full bg-orange px-6 py-3 text-sm font-bold text-white hover:opacity-90" pendingText="Saving…" doneText="✓ Saved">
Save changes
</SubmitButton>
      </form>
    </div>
  );
}
