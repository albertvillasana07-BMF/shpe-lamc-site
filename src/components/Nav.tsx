"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Only download the games when someone opens the arcade
const ArcadeModal = dynamic(() => import("@/components/games/ArcadeModal"), { ssr: false });

const links = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/join", label: "Join" },
  { href: "/resources", label: "Resources" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const closeArcade = useCallback(() => setArcadeOpen(false), []);

  // Close with the Escape key and put focus back on the menu button
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="on-dark sticky top-0 z-50 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* The whole title is the button back to the home page */}
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-90"
          aria-label="SHPE Los Angeles Mission College, home"
        >
          <Image
            src="/images/symbol.png"
            alt=""
            width={52}
            height={52}
            priority
            className="h-11 w-11 shrink-0 sm:h-[52px] sm:w-[52px]"
          />
          <span className="flex flex-col items-start">
            <Image
              src="/images/shpe-wordmark-white.png"
              alt=""
              width={395}
              height={146}
              priority
              className="h-7 w-auto sm:h-[38px]"
            />
            <span className="font-shpe mt-1 whitespace-nowrap text-xs font-semibold text-orange-bright [font-stretch:75%] sm:text-[15px]">
              Los Angeles Mission College
            </span>
          </span>
        </Link>

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px] rounded-lg border border-white/50 hover:border-white"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span
            aria-hidden="true"
            className={`h-0.5 w-6 rounded bg-white transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`}
          />
          <span
            aria-hidden="true"
            className={`h-0.5 w-6 rounded bg-white transition-opacity ${open ? "opacity-0" : ""}`}
          />
          <span
            aria-hidden="true"
            className={`h-0.5 w-6 rounded bg-white transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
          />
        </button>
      </div>

      <nav
        id="site-menu"
        aria-label="Main"
        hidden={!open}
        className="border-t border-white/10 bg-navy-light"
      >
        <ul className="mx-auto max-w-6xl px-4 py-2">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href} className="border-b border-white/10 last:border-b-0">
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block py-3 text-lg font-semibold hover:text-gold ${
                    active ? "text-gold" : "text-white"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
          <li className="border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setArcadeOpen(true);
              }}
              className="flex w-full items-center gap-2 py-3 text-left text-lg font-semibold text-white hover:text-gold"
            >
              Games <span aria-hidden="true">🎮</span>
            </button>
          </li>
        </ul>
      </nav>
      {arcadeOpen && <ArcadeModal onClose={closeArcade} />}
    </header>
  );
}
