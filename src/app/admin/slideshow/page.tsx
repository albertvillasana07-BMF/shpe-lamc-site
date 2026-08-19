import { createClient } from "@/lib/supabase/server";
import type { SlideshowPhotoRow } from "@/lib/types";
import ImageUploadField from "@/components/ImageUploadField";
import { addSlideshowPhoto, deleteSlideshowPhoto } from "./actions";

export default async function AdminSlideshowPage() {
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("slideshow_photos")
    .select("*")
    .order("sort_order", { ascending: true });

  const rows = (photos ?? []) as SlideshowPhotoRow[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold text-navy">
        Homepage Photo Slideshow
      </h1>
      <p className="mb-6 text-sm text-navy/60">
        Photos that crossfade below the hero banner on the homepage. If
        you don&apos;t add any, the slideshow falls back to default images.
      </p>

      <form
        action={addSlideshowPhoto}
        className="mb-8 grid gap-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
      >
        <ImageUploadField name="image_url" label="Photo" folder="slideshow" aspect={16 / 9} />
        <input
          name="caption"
          placeholder="Caption (optional)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <input
          name="sort_order"
          type="number"
          placeholder="Order (0 = first)"
          className="rounded-lg border border-black/10 px-3 py-2"
        />
        <button className="w-fit rounded-full bg-orange px-6 py-2 text-sm font-bold text-white hover:opacity-90">
          Add Photo
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {rows.map((p) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image_url}
              alt={p.caption ?? ""}
              className="h-32 w-full object-cover"
            />
            <div className="p-2">
              {p.caption && <p className="mb-1 text-xs text-navy/60">{p.caption}</p>}
              <form action={deleteSlideshowPhoto}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-xs font-bold text-pink hover:underline">
                  Remove
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
