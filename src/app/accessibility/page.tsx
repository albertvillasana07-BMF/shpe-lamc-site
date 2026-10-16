import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { createPublicClient } from "@/lib/supabase/public";

// Cached and rebuilt at most every 60 minutes, or right away when an admin saves a change.
export const revalidate = 3600;


export const metadata: Metadata = { title: "Accessibility" };

export default async function AccessibilityPage() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("site_settings")
    .select("chapter_email")
    .eq("id", 1)
    .single();
  const email = (data as { chapter_email: string | null } | null)?.chapter_email;

  return (
    <div>
      <PageHeader
        title="Accessibility"
        subtitle="Our commitment to a website everyone can use."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 text-lg leading-relaxed text-navy/80">
        <p className="mb-5">
          SHPE LAMC wants every student, family member, and partner to be able
          to use this website, including people who use screen readers,
          keyboard navigation, captions, magnification, or other assistive
          technology.
        </p>

        <h2 className="mb-3 mt-8 text-2xl text-navy">What we do</h2>
        <p className="mb-5">
          This site is built to follow the Web Content Accessibility Guidelines
          (WCAG) 2.1 at the AA level, the standard used for the Americans with
          Disabilities Act. That includes readable color contrast, full keyboard
          access, labeled form fields, descriptions on photos, a pause button on
          the photo slideshow, and support for your device&apos;s reduce motion
          setting.
        </p>

        <h2 className="mb-3 mt-8 text-2xl text-navy">Report a problem</h2>
        <p className="mb-5">
          If something on this site is hard to use or doesn&apos;t work with your
          assistive technology, please tell us so we can fix it. Let us know
          the page and what happened.{" "}
          {email ? (
            <>
              Email us at{" "}
              <a href={`mailto:${email}`} className="font-semibold text-orange underline underline-offset-2">
                {email}
              </a>
              .
            </>
          ) : (
            <>Reach out through the contact information on our Contact page.</>
          )}
        </p>

        <h2 className="mb-3 mt-8 text-2xl text-navy">Events and accommodations</h2>
        <p>
          If you need an accommodation to attend one of our events, contact us
          as early as you can and we&apos;ll work with you and Los Angeles
          Mission College to make it happen.
        </p>
      </div>
    </div>
  );
}
