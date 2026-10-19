import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import WordleGame from "@/components/games/WordleGame";

export const metadata: Metadata = { title: "Weekly Wordle" };

export default function WordlePage() {
  return (
    <div>
      <PageHeader title="Weekly Wordle" subtitle="One word a week. Fewest guesses wins." />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Link href="/games" className="mb-6 inline-block text-sm font-bold text-orange hover:underline">
          ← All games
        </Link>
        <WordleGame />
      </div>
    </div>
  );
}
