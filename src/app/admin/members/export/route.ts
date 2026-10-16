import { createClient } from "@/lib/supabase/server";
import { todayInLA } from "@/lib/dates";
import type { MemberRow } from "@/lib/types";

// Stops spreadsheet apps from treating a cell like "=SUM(...)" as a formula
function csvCell(value: string | null) {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Please sign in", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return new Response("Admins only", { status: 403 });

  const { data } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as MemberRow[];

  const csv = [
    ["Name", "Email", "Student ID", "Joined"].map(csvCell).join(","),
    ...rows.map((m) =>
      [m.full_name, m.email, m.student_id, m.created_at.slice(0, 10)].map(csvCell).join(",")
    ),
  ].join("\r\n");

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shpe-lamc-members-${todayInLA()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
