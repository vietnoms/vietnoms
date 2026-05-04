import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroSlideshow } from "@/components/home/hero-slideshow";

export function CateringHeroSection() {
  return (
    <section className="relative bg-brand-black text-white overflow-hidden">
      <HeroSlideshow apiUrl="/api/catering-hero" fallbackImage="" />

      {/* Dark overlay */}
      <div className="absolute inset-0 z-[2] bg-black/35" />
      {/* Radial glow */}
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_30%_50%,_rgba(255,51,51,0.12)_0%,_rgba(253,208,92,0.08)_30%,_transparent_70%)]" />

      <div className="relative z-[3] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Catering
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-200 max-w-lg">
            Bring the bold flavors of Vietnam to your next event. Bun bowl bars,
            party platters, and individually prepared bowls — all at $20 per
            person.
          </p>
          <div className="mt-8">
            <Button asChild size="xl">
              <Link href="/catering#order">Start Your Order</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
