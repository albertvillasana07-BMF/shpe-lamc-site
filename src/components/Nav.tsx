"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const links = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/join", label: "Join" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/shpe-logo.jpeg"
            alt="SHPE logo"
            width={28}
            height={28}
            className="rounded-full object-contain"
          />
          <span className="font-heading text-lg leading-none">SHPE LAMC</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-semibold hover:text-gold">
              {l.label}
            </Link>
          ))}
          <Link
            href={user ? "/admin" : "/login"}
            className="border-l border-white/25 pl-6 text-sm font-semibold hover:text-gold"
          >
            {user ? "Admin" : "Board Login"}
          </Link>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7h20M3 13h20M3 19h20" />
          </svg>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-semibold">
              {l.label}
            </Link>
          ))}
          <Link
            href={user ? "/admin" : "/login"}
            onClick={() => setOpen(false)}
            className="w-fit border-t border-white/10 pt-3 text-sm font-semibold"
          >
            {user ? "Admin" : "Board Login"}
          </Link>
        </nav>
      )}
    </header>
  );
}
