import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CateringBanner() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-200 order-2 md:order-1">
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Catering Photo
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-black">
              Catering for Your
              <br />
              Next Event
            </h2>
            <div className="mt-2 h-1 w-16 bg-brand-yellow rounded-full" />
            <p className="mt-6 text-gray-600 leading-relaxed">
              From corporate lunches to wedding celebrations, our Vietnamese
              catering brings bold flavors to any occasion. Choose from our pho
              bar, banh mi spread, or full Vietnamese feast packages.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/catering">Explore Catering</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
