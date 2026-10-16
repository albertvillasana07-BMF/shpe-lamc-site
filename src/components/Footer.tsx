import Link from "next/link";
import DisciplineBar from "@/components/DisciplineBar";
import { createPublicClient } from "@/lib/supabase/public";
import type { SiteSettings } from "@/lib/types";

export default async function Footer() {
  const supabase = createPublicClient();
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
      <DisciplineBar size="sm" />
      <div className="on-dark bg-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-lg font-extrabold">
              <span className="font-shpe">SHPE</span> LAMC
            </p>
            <p className="text-sm text-white/80">Los Angeles Mission College</p>
          </div>
          <div className="text-sm text-white/80 md:text-right">
            <p>
              Email:{" "}
              {email ? (
                <a href={`mailto:${email}`} className="font-semibold text-gold underline-offset-2 hover:underline">
                  {email}
                </a>
              ) : (
                <span className="font-semibold text-gold">[chapter email]</span>
              )}
            </p>
            <p>
              Instagram:{" "}
              {instagram ? (
                <a
                  href={`https://instagram.com/${instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gold underline-offset-2 hover:underline"
                >
                  {instagram}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="font-semibold text-gold">[@handle]</span>
              )}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-6xl flex-wrap justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/80">
          <Link href="/accessibility" className="underline-offset-2 hover:underline">
            Accessibility
          </Link>
          {/* Board members sign in here. Already signed in? It goes straight to the dashboard. */}
          <Link href="/login" className="underline-offset-2 hover:underline">
            Board login
          </Link>
        </div>
      </div>
    </footer>
  );
}
