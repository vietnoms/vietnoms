import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AboutSnippet() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-black">
              Our Story
            </h2>
            <div className="mt-1 h-1 w-16 bg-brand-red rounded-full" />
            <p className="mt-6 text-gray-600 leading-relaxed">
              At Vietnoms, we bring the vibrant flavors of Vietnam to San Jose.
              Every dish is crafted with authentic recipes passed down through
              generations, using the freshest ingredients we can source.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              From our signature pho to our crispy banh mi, each bite tells a
              story of tradition, passion, and the warmth of Vietnamese
              hospitality.
            </p>
            <Button asChild variant="link" className="mt-4 px-0 text-base">
              <Link href="/about">Read Our Full Story &rarr;</Link>
            </Button>
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-200">
            {/* Placeholder for restaurant/team photo */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span className="text-sm">Restaurant Photo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
