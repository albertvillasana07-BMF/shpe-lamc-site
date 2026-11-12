"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Phone-only bottom tab bar, like an app: quick taps to the main pages,
 * plus "Menu" to open the full hamburger menu. Hidden on desktop, in the admin
 * area, and while a game is being played (more room, no accidental taps).
 */
const TABS = [
  {
    href: "/",
    label: "Home",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />,
  },
  {
    href: "/events",
    label: "Events",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/join",
    label: "Join",
    icon: (
      <>
        <circle cx="10" cy="8" r="4" />
        <path d="M2 21c0-4 3.6-7 8-7s8 3 8 7M19 8v6M16 11h6" />
      </>
    ),
  },
  {
    href: "/games",
    label: "Arcade",
    icon: (
      <>
        <rect x="2" y="7" width="20" height="12" rx="4" />
        <path d="M7 11v4M5 13h4M15.5 12h.01M18 14h.01" />
      </>
    ),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    function onGame(e: Event) {
      setGameActive(!!(e as CustomEvent<{ active: boolean }>).detail?.active);
    }
    window.addEventListener("shpe-game-active", onGame);
    return () => window.removeEventListener("shpe-game-active", onGame);
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="Quick links"
      className={`on-dark fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy/95 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur transition-transform duration-300 md:hidden ${
        gameActive ? "translate-y-full" : ""
      }`}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  active ? "text-gold" : "text-white/85"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {t.icon}
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              window.dispatchEvent(new Event("shpe-open-menu"));
            }}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white/85"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            Menu
          </button>
        </li>
      </ul>
    </nav>
  );
}
