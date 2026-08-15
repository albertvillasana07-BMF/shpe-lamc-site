import Image from "next/image";
import Link from "next/link";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import { createClient } from "@/lib/supabase/server";
import type { HomeHighlightRow, SiteSettings } from "@/lib/types";

const DEFAULT_HERO_SUBTITLE =
  "Engineering students at Los Angeles Mission College building community, mentorship, and career opportunities — together.";

const DEFAULT_ABOUT_US =
  "SHPE LAMC is the Los Angeles Mission College chapter of the Society of Hispanic Professional Engineers. We connect engineering students with mentorship, scholarships, and career opportunities, while giving back through outreach to local middle and high schools.";

const DEFAULT_HIGHLIGHTS = [
  {
    title: "Mentorship & Networking",
    body: "Connect with engineering professionals and alumni.",
    color: "bg-orange",
  },
  {
    title: "Scholarships",
    body: "Opportunities through SHPE National and local sponsors.",
    color: "bg-teal",
  },
  {
    title: "National Convention",
    body: "Travel, workshops, and the career fair.",
    color: "bg-pink",
  },
  {
    title: "Hands-on Outreach",
    body: "Work with local middle & high school programs.",
    color: "bg-navy",
  },
  {
    title: "Resume & Interview Prep",
    body: "Workshops throughout the semester.",
    color: "bg-gold",
  },
  {
    title: "Community",
    body: "A community that supports your path through engineering.",
    color: "bg-orange",
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: settingsData }, { data: highlightsData }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    supabase.from("home_highlights").select("*").order("sort_order", { ascending: true }),
  ]);

  const settings = settingsData as SiteSettings | null;
  const dbHighlights = (highlightsData ?? []) as HomeHighlightRow[];

  const heroSubtitle = settings?.hero_subtitle || DEFAULT_HERO_SUBTITLE;
  const aboutUs = settings?.about_us || DEFAULT_ABOUT_US;
  const highlights = dbHighlights.length > 0 ? dbHighlights : DEFAULT_HIGHLIGHTS;

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <div className="relative aspect-[2/1] w-full md:aspect-[16/7]">
          <Image
            src="/images/hero-banner.jpg"
            alt="SHPE LAMC — Society of Hispanic Professional Engineers, LAMC STEM"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="stripe-bar h-2 w-full" />
        <div className="mx-auto max-w-3xl px-4 py-4 text-center text-sm text-navy/70">
          {heroSubtitle}
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-4 pb-6">
          <Link
            href="/join"
            className="rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow hover:opacity-90"
          >
            Join SHPE LAMC
          </Link>
          <Link
            href="/events"
            className="rounded-full border-2 border-navy px-6 py-3 text-sm font-bold text-navy hover:bg-navy/5"
          >
            See Upcoming Events
          </Link>
        </div>
      </section>

      {/* Photo slideshow */}
      <section className="px-4">
        <PhotoSlideshow />
      </section>

      {/* About */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-pink">
          About Us
        </h2>
        <p className="max-w-3xl whitespace-pre-line text-lg text-navy/90">
          {aboutUs}
        </p>
      </section>

      {/* Why join */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-6 text-center text-sm font-extrabold uppercase tracking-widest text-pink">
          Why Join
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, i) => (
            <div
              key={"id" in item ? item.id : i}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
            >
              <div className={`mb-3 h-2 w-10 rounded-full ${item.color ?? "bg-orange"}`} />
              <h3 className="mb-1 font-bold text-navy">{item.title}</h3>
              <p className="text-sm text-navy/70">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
