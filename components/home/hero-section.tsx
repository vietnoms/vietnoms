import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  subtitle?: string;
}

export function HeroSection({ subtitle }: HeroSectionProps) {
  return (
    <section className="relative bg-brand-black text-white overflow-hidden" style={{ perspective: "1000px" }}>
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-shift bg-[length:200%_200%]"
        style={{
          backgroundImage: "linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 25%, #1a1a2a 50%, #2a1a1a 75%, #1a1a1a 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      {/* Radial glow behind heading */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,_rgba(255,51,51,0.12)_0%,_rgba(253,208,92,0.08)_30%,_transparent_70%)]" />
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 md:py-40 lg:py-48" style={{ willChange: "transform" }}>
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Authentic
            <br />
            <span className="bg-gradient-to-r from-brand-yellow to-brand-red bg-clip-text text-transparent">Vietnamese</span>
            <br />
            Cuisine
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-200 max-w-lg">
            {subtitle || "Bun bowls, crispy banh mi, nuoc mam wings, and Vietnamese coffee. Made with love in San Jose."}
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
