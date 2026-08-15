import Link from "next/link";
import { signout } from "@/app/signout/actions";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/board", label: "Board" },
  { href: "/admin/home-highlights", label: "Homepage" },
  { href: "/admin/settings", label: "Contact Info" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/sponsor-inquiries", label: "Sponsor Inquiries" },
  { href: "/admin/scholarships", label: "Scholarships" },
];

export default function AdminNav({
  isOwner,
  fullName,
}: {
  isOwner: boolean;
  fullName: string | null;
}) {
  return (
    <div className="border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-bold text-navy hover:text-orange"
            >
              {l.label}
            </Link>
          ))}
          {isOwner && (
            <Link
              href="/admin/approvals"
              className="rounded-full bg-pink/10 px-3 py-1 text-sm font-bold text-pink hover:bg-pink/20"
            >
              Approvals
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-navy/60">
            {fullName ?? "Board member"} {isOwner && "· Owner"}
          </span>
          <form action={signout}>
            <button className="font-bold text-navy/50 hover:text-navy">
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
