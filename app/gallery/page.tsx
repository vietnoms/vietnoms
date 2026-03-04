import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { GalleryGrid } from "@/components/gallery-grid";

export const metadata: Metadata = {
  title: "Gallery | Vietnoms Vietnamese Restaurant",
  description:
    "Browse photos of our authentic Vietnamese dishes, restaurant interior, catering events, and team at Vietnoms in San Jose.",
  openGraph: {
    title: "Gallery | Vietnoms",
    description:
      "Browse photos of our authentic Vietnamese dishes and restaurant.",
  },
};

export default function GalleryPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Gallery", url: `${RESTAURANT.url}/gallery` },
        ]}
      />

      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Gallery
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            A taste of Vietnoms through the lens.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GalleryGrid />
        </div>
      </section>
    </>
  );
}
