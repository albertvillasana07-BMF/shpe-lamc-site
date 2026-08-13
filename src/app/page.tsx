import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="gradient-header relative overflow-hidden text-white">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.25) 2px, transparent 2px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-40 items-center justify-center rounded-xl bg-white p-2 shadow-lg">
              <Image
                src="/images/shpe-logo.jpeg"
                alt="SHPE logo"
                width={160}
                height={64}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex h-16 w-40 items-center justify-center rounded-xl bg-white p-2 shadow-lg">
              <Image
                src="/images/lamc-stem-logo.png"
                alt="LAMC STEM logo"
                width={160}
                height={64}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <span className="rounded-full bg-gold px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-navy">
            LAMC Chapter
          </span>
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            SHPE <span className="text-gold">LAMC</span>
          </h1>
          <p className="max-w-2xl text-base font-semibold text-white/90 md:text-lg">
            Engineering students at Los Angeles Mission College building community,
            mentorship, and career opportunities — together.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/join"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-navy shadow hover:opacity-90"
            >
              Join SHPE LAMC
            </Link>
            <Link
              href="/events"
              className="rounded-full border-2 border-white px-6 py-3 text-sm font-bold hover:bg-white/10"
            >
              See Upcoming Events
            </Link>
          </div>
        </div>
        <div className="stripe-bar h-2 w-full" />
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
