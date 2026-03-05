import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { reader } from "@/lib/keystatic";

export const metadata: Metadata = {
  title: "About Vietnoms | Our Story | Vietnamese Restaurant San Jose",
  description:
    "Learn about Vietnoms — our story, our team, and our passion for authentic Vietnamese cuisine in San Jose, California.",
  openGraph: {
    title: "About Vietnoms | Our Story",
    description:
      "Learn about Vietnoms — our story, our team, and our passion for authentic Vietnamese cuisine in San Jose.",
  },
};

export default async function AboutPage() {
  const about = await reader.singletons.aboutPage.read().catch(() => null);
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "About", url: `${RESTAURANT.url}/about` },
        ]}
      />

      {/* Hero */}
      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Our Story
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            {about?.heroSubtitle || "From humble beginnings to San Jose's favorite Vietnamese restaurant."}
          </p>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-white">
                {about?.originTitle || "How It Started"}
              </h2>
              <div className="mt-2 h-1 w-16 bg-brand-red rounded-full" />
              <p className="mt-6 text-gray-400 leading-relaxed">
                {about?.originText1 || "Vietnoms was born from a deep love for Vietnamese food and a desire to share authentic flavors with the San Jose community. Our recipes have been passed down through generations, perfected over decades of family cooking."}
              </p>
              <p className="mt-4 text-gray-400 leading-relaxed">
                {about?.originText2 || "What started as a dream became reality when we opened our doors, serving the same dishes that brought our family together around the dinner table — rich, slow-simmered pho, crispy banh mi, and refreshing Vietnamese coffee."}
              </p>
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-800">
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Team / Kitchen Photo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-surface-alt/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-white text-center">
            What We Stand For
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full" />

          <div className="mt-12 grid sm:grid-cols-3 gap-8">
            {(about?.values && about.values.length > 0
              ? about.values.map((v) => ({ title: v.title, desc: v.description }))
              : [
                  { title: "Authenticity", desc: "Traditional recipes made the way they were meant to be. No shortcuts, no compromises." },
                  { title: "Fresh Ingredients", desc: "We source the freshest herbs, produce, and proteins daily to ensure quality in every dish." },
                  { title: "Community", desc: "We're proud to be part of the San Jose community, serving neighbors and friends alike." },
                ]
            ).map((value) => (
              <div key={value.title} className="text-center">
                <h3 className="font-display text-xl font-semibold text-white">
                  {value.title}
                </h3>
                <p className="mt-3 text-gray-400">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DDD Mention */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            As Seen On
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-yellow rounded-full" />
          <p className="mt-6 text-gray-400 max-w-xl mx-auto">
            {about?.dddText || 'We were featured on Diners, Drive-Ins and Dives! Guy Fieri loved our classic pho and called our banh mi "out of bounds."'}
          </p>
          <div className="mt-8 aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden bg-gray-800">
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              DDD Feature Photo / Video Embed
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
