"use client";

import { useEffect, useRef, useState } from "react";
import { buildBookmarklet } from "@/lib/lamcBookmarklet";

export default function BookmarkletInstaller() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  // React blocks "javascript:" links, so the bookmark link is set up after load
  useEffect(() => {
    const c = buildBookmarklet(window.location.origin);
    linkRef.current?.setAttribute("href", c);
    setTimeout(() => setCode(c), 0);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <a
          ref={linkRef}
          onClick={(e) => {
            e.preventDefault();
            alert(
              "Don't click it here. Drag this button up to your bookmarks bar, then click it while you're on LAMC's events page."
            );
          }}
          className="cursor-grab rounded-full bg-orange px-5 py-2.5 text-sm font-bold text-white shadow active:cursor-grabbing"
        >
          📅 Send to SHPE
        </a>
        <span className="text-sm text-navy/80">
          ← Drag this button to your browser&apos;s bookmarks bar (one time only)
        </span>
      </div>
      <details className="text-sm text-navy/80">
        <summary className="cursor-pointer font-semibold text-navy">
          Can&apos;t drag it? (phone, or no bookmarks bar)
        </summary>
        <ol className="ml-5 mt-2 list-decimal space-y-1">
          <li>
            Show your bookmarks bar: Chrome <strong>Cmd/Ctrl + Shift + B</strong>, Safari{" "}
            <strong>View, then Show Favorites Bar</strong>.
          </li>
          <li>Or copy the code below, make a new bookmark named &quot;Send to SHPE,&quot; and paste it as the address.</li>
        </ol>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {}
          }}
          className="mt-2 rounded-full border-2 border-navy px-4 py-1.5 text-sm font-bold text-navy hover:bg-navy hover:text-white"
        >
          {copied ? "✓ Copied" : "Copy bookmark code"}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Bookmark code copied" : ""}
        </span>
      </details>
    </div>
  );
}
