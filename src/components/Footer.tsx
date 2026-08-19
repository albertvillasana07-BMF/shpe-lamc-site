import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";

export default async function Footer() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("chapter_email, instagram_handle")
    .eq("id", 1)
    .single();
  const settings = data as Pick<SiteSettings, "chapter_email" | "instagram_handle"> | null;

  const email = settings?.chapter_email;
  const instagram = settings?.instagram_handle;

  return (
    <footer className="mt-16">
      <div className="stripe-bar h-1.5 w-full" />
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-lg font-extrabold">SHPE LAMC</p>
            <p className="text-sm text-white/70">Los Angeles Mission College</p>
          </div>
          <div className="text-sm text-white/70 md:text-right">
            <p>
              Email:{" "}
              {email ? (
                <a href={`mailto:${email}`} className="font-semibold text-gold hover:underline">{email}</a>
              ) : (
                <span className="font-semibold text-gold">[chapter email]</span>
              )}
            </p>
            <p>
              Instagram:{" "}
              {instagram ? (
                <a href={`https://instagram.com/${instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">{instagram}</a>
              ) : (
                <span className="font-semibold text-gold">[@handle]</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}