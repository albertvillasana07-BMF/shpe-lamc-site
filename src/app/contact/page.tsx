import PageHeader from "@/components/PageHeader";

export default function ContactPage() {
  return (
    <div>
      <PageHeader title="Contact Us" subtitle="Get in touch with SHPE LAMC." />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
          <dl className="flex flex-col gap-5">
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-pink">
                Email
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy">
                [chapter email]
              </dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-pink">
                Instagram
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy">[@handle]</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-pink">
                Location
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy">
                Los Angeles Mission College
              </dd>
            </div>
          </dl>
        </div>
        <p className="mt-6 text-center text-sm text-navy/60">
          Interested in sponsoring, mentoring, or partnering with us? Reach out —
          we&apos;d love to hear from you.
        </p>
      </div>
    </div>
  );
}
