import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Games" };

const GAMES = [
  {
    href: "/games/wordle",
    emoji: "🔤",
    title: "Weekly Wordle",
    text: "A new 5-letter word every Monday. Solve it in as few guesses as you can and top this week's leaderboard.",
    tag: "New word weekly",
  },
  {
    href: "/games/rocket",
    emoji: "🚀",
    title: "Rocket SHPE",
    text: "Launch from LAMC into deep space. Dodge asteroids, grab SHPE logos, and see how far you can fly.",
    tag: "Arcade",
  },
];

export default function GamesPage() {
  return (
    <div>
      <PageHeader title="SHPE Arcade" subtitle="Take a study break. Weekly leaderboards, bragging rights included." />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ul className="grid gap-5 sm:grid-cols-2">
          {GAMES.map((g) => (
            <li key={g.href}>
              <Link
                href={g.href}
                className="group flex h-full flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-4xl" aria-hidden="true">{g.emoji}</span>
                <span className="mt-3 w-fit rounded-full bg-orange/10 px-3 py-0.5 text-xs font-bold text-orange">
                  {g.tag}
                </span>
                <h2 className="mt-2 text-2xl text-navy group-hover:underline">{g.title}</h2>
                <p className="mt-1 text-navy/80">{g.text}</p>
                <span className="mt-4 font-bold text-orange" aria-hidden="true">Play →</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 rounded-2xl border border-dashed border-navy/40 p-5 text-center text-navy/80">
          <span aria-hidden="true">🤫 </span>
          There&apos;s also a secret game hidden somewhere on this site, with its own
          leaderboard. Can you find it?
        </p>
      </div>
    </div>
  );
}
