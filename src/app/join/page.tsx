import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import JoinForm from "@/components/JoinForm";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";

export default async function JoinPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("join_image_url")
    .eq("id", 1)
    .single();
  const settings = data as Pick<SiteSettings, "join_image_url"> | null;
  const joinImage = settings?.join_image_url || "/images/hero-banner.jpg";

  return (
    <div>
      <PageHeader
        title="Join SHPE LAMC"
        subtitle="Sign up in a minute — no forms, no QR codes, just fill it out below."
      />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm md:grid-cols-2">
          <div className="relative min-h-[200px] bg-navy/5">
            <Image
              src={joinImage}
              alt="SHPE LAMC members"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
              unoptimized={joinImage.startsWith("http")}
            />
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-3 flex items-center gap-2">
              <Image
                src="/images/shpe-symbol.png"
                alt="SHPE LAMC logo"
                width={24}
                height={24}
                className="object-contain"
              />
              <h2 className="text-lg">Join SHPE LAMC</h2>
            </div>
            <p className="mb-4 text-sm text-navy/70">
              SHPE connects Hispanic engineering students with mentorship,
              scholarships, and career opportunities.
            </p>
            <ul className="mb-6 flex flex-col gap-1.5 text-sm text-navy/70">
              <li>🎓 Scholarships</li>
              <li>🤝 Mentorship</li>
              <li>✈️ Convention opportunity</li>
            </ul>

            <JoinForm />
          </div>
        </div>
      </div>
    </div>
  );
}