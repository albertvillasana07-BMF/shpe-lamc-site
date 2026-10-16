import type { SiteSettings } from "@/lib/types";

export const DEFAULT_STORY_TEXT = `SHPE at Los Angeles Mission College was brought back to life by Vincent Esparza, who restarted the chapter as its president. Because of his work, LAMC engineering students once again have a home for mentorship, community, and a real path into the field.

Today we're a chapter dedicated to bettering our community. Working alongside LAMC, we bring hands-on science to local kids and families, showing the next generation that engineering is something they can see themselves doing.

And we build with the future in mind. Everything we do is about making sure the students who follow us are ready to step into the roles we leave behind.`;

export const DEFAULT_BUILDER_TEXT = `This website was created by Alberto Villasana, chapter president, so that SHPE LAMC never has to start from scratch again. Community college chapters turn over fast. Officers transfer, and too often what they built leaves with them.

This site is meant to stay behind: a home for our resources, a tool to recruit new members, and something future boards can lean on and keep building, long after we've moved on.`;

export const DEFAULT_BUILDER_SIGNATURE = "Alberto Villasana, Chapter President";
export const DEFAULT_MOS_TEXT = "Hands-on experiments that get kids excited about science.";
export const DEFAULT_SIS_TEXT = "A spring event bringing STEM to our local community.";

function Paragraphs({ text, className }: { text: string; className: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={className}>
            {p}
          </p>
        ))}
    </>
  );
}

function PersonIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EventCard({
  title,
  text,
  imageUrl,
  imageAlt,
  tint,
}: {
  title: string;
  text: string;
  imageUrl: string | null | undefined;
  imageAlt: string | null | undefined;
  tint: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className={`relative aspect-[16/9] w-full ${tint}`}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async"
            src={imageUrl}
            alt={imageAlt ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg text-navy">{title}</h3>
        <p className="mt-1 text-sm text-navy/80">{text}</p>
      </div>
    </article>
  );
}

export default function OurStory({ settings }: { settings: SiteSettings | null }) {
  const storyText = settings?.story_text || DEFAULT_STORY_TEXT;
  const builderText = settings?.builder_text || DEFAULT_BUILDER_TEXT;

  return (
    <section aria-labelledby="our-story-heading" className="mx-auto max-w-6xl px-4 py-14">
      <h2 id="our-story-heading" className="mb-8 text-3xl text-navy md:text-4xl">
        Our story
      </h2>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <figure className="max-w-[240px]">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-navy/10 text-navy/70">
            {settings?.founder_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async"
                src={settings.founder_image_url}
                alt={settings.founder_image_alt || "Vincent Esparza"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <PersonIcon size={56} />
              </div>
            )}
          </div>
          <figcaption className="mt-3">
            <span className="block text-xl font-bold text-navy">Vincent Esparza</span>
            <span className="block text-sm font-semibold text-red">
              Restarted <span className="font-shpe">SHPE</span> LAMC
            </span>
          </figcaption>
        </figure>

        <div className="max-w-2xl">
          <Paragraphs text={storyText} className="mb-4 text-lg leading-relaxed text-navy/80" />
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <EventCard
          title="Magic of Science"
          text={settings?.mos_text || DEFAULT_MOS_TEXT}
          imageUrl={settings?.mos_image_url}
          imageAlt={settings?.mos_image_alt}
          tint="bg-orange/10"
        />
        <EventCard
          title="Spring into STEM"
          text={settings?.sis_text || DEFAULT_SIS_TEXT}
          imageUrl={settings?.sis_image_url}
          imageAlt={settings?.sis_image_alt}
          tint="bg-teal/10"
        />
      </div>

      <div className="on-dark mt-10 grid gap-6 rounded-2xl bg-navy p-6 text-white sm:grid-cols-[auto_1fr] md:p-8">
        <div className="h-24 w-24 overflow-hidden rounded-full bg-navy-light text-white/80">
          {settings?.builder_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async"
              src={settings.builder_image_url}
              alt={settings.builder_image_alt || "Alberto Villasana"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PersonIcon size={40} />
            </div>
          )}
        </div>
        <div className="max-w-2xl">
          <h3 className="text-2xl text-white">Built for the chapters that come next</h3>
          <div className="mt-3">
            <Paragraphs text={builderText} className="mb-3 leading-relaxed text-white/90" />
          </div>
          <p className="mt-2 text-sm font-semibold text-orange-bright">
            {settings?.builder_signature || DEFAULT_BUILDER_SIGNATURE}
          </p>
        </div>
      </div>
    </section>
  );
}
