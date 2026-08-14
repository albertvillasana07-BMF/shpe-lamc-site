import Image from "next/image";
import Link from "next/link";
import PhotoSlideshow from "@/components/PhotoSlideshow";

export default function HomePage() {
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
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-4 py-6">
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
        <p className="max-w-3xl text-lg text-navy/90">
          SHPE LAMC is the Los Angeles Mission College chapter of the Society of
          Hispanic Professional Engineers. We connect engineering students with
          mentorship, scholarships, and career opportunities, while giving back
          through outreach to local middle and high schools.
        </p>
      </section>

      {/* Why join */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-6 text-center text-sm font-extrabold uppercase tracking-widest text-pink">
          Why Join
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
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
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
            >
              <div className={`mb-3 h-2 w-10 rounded-full ${item.color}`} />
              <h3 className="mb-1 font-bold text-navy">{item.title}</h3>
              <p className="text-sm text-navy/70">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
