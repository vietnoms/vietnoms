import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { MenuItem } from "@/lib/types";

/** Target dish names to feature — matched case-insensitively against Square catalog. */
export const FEATURED_NAMES = [
  "Bun Bowl",
  "Nuoc Mam Wings",
  "The Big Classic",
  "Banh Mi",
];

interface FeaturedDishesProps {
  items: MenuItem[];
  heading?: string;
  subtext?: string;
}

export function FeaturedDishes({ items, heading, subtext }: FeaturedDishesProps) {
  if (items.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-surface-alt/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-yellow text-glow-yellow">
            {heading || "Signature Dishes"}
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full shadow-sm shadow-red-500/50" />
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            {subtext || "Explore our most-loved dishes, made fresh daily with authentic Vietnamese flavors."}
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <Link key={item.slug} href={`/menu/${item.slug}`}>
              <Card className="group overflow-hidden hover:shadow-md hover:-translate-y-0.5 h-full">
                <div className="aspect-square bg-gray-800 relative overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      {item.name}
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-display text-lg font-semibold group-hover:text-brand-red transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="mt-2 font-semibold text-brand-red">
                    {item.formattedPrice}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/menu"
            className="inline-flex items-center text-brand-red font-medium hover:underline"
          >
            View Full Menu &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
