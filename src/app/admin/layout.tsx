import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_owner, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/pending");

  return (
    <div className="min-h-full bg-navy/[0.02]">
      <AdminNav isOwner={profile.is_owner} fullName={profile.full_name} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
