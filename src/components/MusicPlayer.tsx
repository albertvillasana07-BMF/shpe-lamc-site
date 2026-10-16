"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createLofiPlayer, type LofiPlayer } from "@/lib/fun/lofiEngine";

const SEEN_KEY = "shpe-music-seen";

/**
 * Small music button in the corner. Music only starts when someone clicks it
 * (browsers block auto-play, and it's better for screen reader users).
 * Lives in the main layout, so it keeps playing between pages.
 */
export default function MusicPlayer() {
  const player = useRef<LofiPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(50);
  const [glow, setGlow] = useState(false);
  const volId = useId();

  // Glow once for first-time visitors so they notice the button
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    if (seen) return;
    const on = setTimeout(() => setGlow(true), 1200);
    const off = setTimeout(() => setGlow(false), 6000);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, []);

  useEffect(() => () => player.current?.stop(), []);

  function toggle() {
    if (!player.current) player.current = createLofiPlayer();
    if (playing) {
      player.current.stop();
      setPlaying(false);
    } else {
      player.current.setVolume(volume / 100);
      player.current.start();
      setPlaying(true);
      setOpen(true);
    }
    setGlow(false);
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-end gap-2">
      <div className="on-dark flex items-center gap-2 rounded-full bg-navy p-1.5 pr-3 text-white shadow-lg ring-1 ring-white/10">
        <button
          type="button"
          onClick={toggle}
          className={`relative flex h-10 items-center gap-2 rounded-full px-3 text-sm font-bold ${
            playing ? "bg-orange-bright text-navy" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {glow && (
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-full bg-orange-bright/60"
            />
          )}
          {playing ? (
            <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
              {[0, 1, 2].map((b) => (
                <span
                  key={b}
                  className="w-[3px] rounded-sm bg-navy"
                  style={{ animation: `shpe-eq 0.9s ${b * 0.15}s ease-in-out infinite`, height: "100%" }}
                />
              ))}
            </span>
          ) : (
            <span aria-hidden="true">🎵</span>
          )}
          <span>{playing ? "Pause music" : "Turn on the vibes"}</span>
        </button>

        {playing && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-xs font-semibold text-white/80 hover:text-white"
          >
            {open ? "Hide volume" : "Volume"}
          </button>
        )}

        {playing && open && (
          <div className="flex items-center gap-2">
            <label htmlFor={volId} className="sr-only">
              Music volume
            </label>
            <input
              id={volId}
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                player.current?.setVolume(v / 100);
              }}
              className="w-24 accent-[var(--orange-bright)]"
            />
          </div>
        )}
      </div>
      <style>{`@keyframes shpe-eq { 0%,100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } } [style*="shpe-eq"] { transform-origin: bottom; }`}</style>
    </div>
  );
}
