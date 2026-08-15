import PageHeader from "@/components/PageHeader";
import ScholarshipScrollList from "@/components/ScholarshipScrollList";
import { createClient } from "@/lib/supabase/server";
import type { ScholarshipRow } from "@/lib/types";

export default async function ScholarshipsPage() {
  const supabase = await createClient();
  const { data: scholarships } = await supabase
    .from("scholarships")
    .select("*")
    .order("deadline", { ascending: true });

  const rows = (scholarships ?? []) as ScholarshipRow[];

  return (
    <div>
      <PageHeader
        title="Scholarship Resources"
        subtitle="Opportunities for engineering and STEM students — scroll to browse."
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {rows.length === 0 ? (
          <p className="text-navy/60">
            No scholarships posted yet — check back soon.
          </p>
        ) : (
          <ScholarshipScrollList rows={rows} />
        )}
      </div>
    </div>
  );
}
