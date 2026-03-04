import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative bg-brand-black text-white overflow-hidden">
      {/* Background image placeholder - replace with actual hero photo */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 md:py-40 lg:py-48">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Authentic
            <br />
            <span className="text-brand-yellow">Vietnamese</span>
            <br />
            Cuisine
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-200 max-w-lg">
            Fresh pho, crispy banh mi, rich Vietnamese coffee, and so much more.
            Made with love in San Jose.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button asChild size="xl">
              <Link href="/order">Order Now</Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="text-white border-white hover:bg-white/10 hover:text-white">
              <Link href="/menu">View Menu</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
