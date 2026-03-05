import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const FEATURED = [
  {
    name: "Bun Bowl",
    description: "Vermicelli noodles with fresh herbs, pickled veggies, peanuts, and your choice of protein.",
    price: "$14.99",
    slug: "bun-bowl",
    image: "/images/menu/bun-bowl.jpg",
  },
  {
    name: "Nuoc Mam Wings",
    description: "Crispy chicken wings tossed in our house fish sauce glaze with fresh herbs.",
    price: "$12.99",
    slug: "nuoc-mam-wings",
    image: "/images/menu/nuoc-mam-wings.jpg",
  },
  {
    name: "The Big Classic",
    description: "Our signature double-meat bun bowl loaded with two proteins and all the fixings.",
    price: "$18.99",
    slug: "the-big-classic",
    image: "/images/menu/the-big-classic.jpg",
  },
  {
    name: "Banh Mi",
    description: "Crispy baguette with grilled pork, pickled vegetables, and fresh cilantro.",
    price: "$12.99",
    slug: "banh-mi",
    image: "/images/menu/banh-mi.jpg",
  },
];

export function FeaturedDishes() {
  return (
    <section className="py-16 md:py-24 bg-surface-alt/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-yellow text-glow-yellow">
            Signature Dishes
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full shadow-sm shadow-red-500/50" />
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            Explore our most-loved dishes, made fresh daily with authentic
            Vietnamese flavors.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED.map((dish) => (
            <Link key={dish.slug} href={`/menu/${dish.slug}`}>
              <Card className="group overflow-hidden hover:shadow-md hover:-translate-y-0.5 h-full">
                <div className="aspect-square bg-gray-800 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    {dish.name}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-display text-lg font-semibold group-hover:text-brand-red transition-colors">
                    {dish.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                    {dish.description}
                  </p>
                  <p className="mt-2 font-semibold text-brand-red">
                    {dish.price}
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
