import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [events, resources, sponsors, scholarships, pending] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("resources").select("*", { count: "exact", head: true }),
    supabase.from("sponsors").select("*", { count: "exact", head: true }),
    supabase.from("scholarships").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "pending"),
  ]);

  const cards = [
    { label: "Events", value: events.count ?? 0, href: "/admin/events", color: "bg-orange" },
    { label: "Resources", value: resources.count ?? 0, href: "/admin/resources", color: "bg-teal" },
    { label: "Sponsors", value: sponsors.count ?? 0, href: "/admin/sponsors", color: "bg-pink" },
    { label: "Scholarships", value: scholarships.count ?? 0, href: "/admin/scholarships", color: "bg-gold" },
    { label: "Pending Approvals", value: pending.count ?? 0, href: "/admin/approvals", color: "bg-navy" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm hover:shadow-md"
          >
            <div className={`mb-3 h-2 w-10 rounded-full ${c.color}`} />
            <p className="text-3xl font-extrabold text-navy">{c.value}</p>
            <p className="text-sm font-semibold text-navy/60">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
