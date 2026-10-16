import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ScholarshipScrollList from "@/components/ScholarshipScrollList";
import { createClient } from "@/lib/supabase/server";
import type { ScholarshipRow } from "@/lib/types";
import { todayInLA } from "@/lib/dates";

export const metadata: Metadata = { title: "Scholarships" };

export default async function ScholarshipsPage() {
  const supabase = await createClient();
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
