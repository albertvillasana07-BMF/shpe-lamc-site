import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ScholarshipScrollList from "@/components/ScholarshipScrollList";
import { createPublicClient } from "@/lib/supabase/public";
import type { ScholarshipRow } from "@/lib/types";
import { todayInLA } from "@/lib/dates";

// Cached and rebuilt at most every 60 minutes, or right away when an admin saves a change.
export const revalidate = 3600;


export const metadata: Metadata = { title: "Scholarships" };

export default async function ScholarshipsPage() {
  const supabase = createPublicClient();
  const { data: scholarships } = await supabase
    .from("scholarships")
    .select("*")
    .order("deadline", { ascending: true });

  // Scholarships hide themselves once the deadline has passed
  const today = todayInLA();
  const rows = ((scholarships ?? []) as ScholarshipRow[]).filter(
    (s) => !s.deadline || s.deadline >= today
  );

  return (
    <div>
      <PageHeader
        title="Scholarship Resources"
        subtitle="Opportunities for engineering and STEM students — scroll to browse."
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {rows.length === 0 ? (
          <p className="text-navy/70">
            No open scholarships right now. Check back soon.
          </p>
        ) : (
          <ScholarshipScrollList rows={rows} />
        )}
      </div>
    </div>
  );
}
