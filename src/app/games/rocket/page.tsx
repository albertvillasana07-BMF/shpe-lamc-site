import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import RocketGame from "@/components/games/RocketGame";

export const metadata: Metadata = { title: "Rocket SHPE" };

export default function RocketPage() {
  return (
    <div>
      <PageHeader title="Rocket SHPE" subtitle="From the LAMC launch pad to deep space. How far can you go?" />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Link href="/games" className="mb-6 inline-block text-sm font-bold text-orange hover:underline">
          ← All games
        </Link>
        <RocketGame />
      </div>
    </div>
  );
}
