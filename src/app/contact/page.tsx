import PageHeader from "@/components/PageHeader";
import BoardScrollList from "@/components/BoardScrollList";
import { createClient } from "@/lib/supabase/server";
import type { BoardMemberRow, SiteSettings } from "@/lib/types";

export default async function ContactPage() {
  const supabase = await createClient();

  const [{ data: settingsData }, { data: boardData }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    supabase.from("board_members").select("*").order("sort_order", { ascending: true }),
  ]);

  const settings = settingsData as SiteSettings | null;
  const board = (boardData ?? []) as BoardMemberRow[];

  return (
    <div>
      <PageHeader title="Contact Us" subtitle="Get in touch with SHPE LAMC." />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {board.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-4 text-xl">Meet the Board</h2>
            <BoardScrollList rows={board} />
          </div>
        )}

        <div className="rounded-2xl border border-black/5 bg-white p-10 shadow-sm">
          <h2 className="mb-6 text-2xl">Contact Us</h2>
          <dl className="flex flex-col gap-6">
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-pink">
                Email
              </dt>
              <dd className="mt-1 text-xl font-semibold text-navy">
                {settings?.chapter_email ?? "[chapter email]"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-pink">
                Instagram
              </dt>
              <dd className="mt-1 text-xl font-semibold text-navy">
                {settings?.instagram_handle ?? "[@handle]"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-pink">
                Location
              </dt>
              <dd className="mt-1 text-xl font-semibold text-navy">
                {settings?.location ?? "Los Angeles Mission College"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}