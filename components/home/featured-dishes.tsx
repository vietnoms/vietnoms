import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const FEATURED = [
  {
    name: "Classic Pho",
    description: "Rich bone broth simmered for 24 hours with rice noodles and fresh herbs.",
    price: "$14.99",
    slug: "classic-pho",
    image: "/images/menu/classic-pho.jpg",
  },
  {
    name: "Banh Mi",
    description: "Crispy baguette with grilled pork, pickled vegetables, and fresh cilantro.",
    price: "$12.99",
    slug: "banh-mi",
    image: "/images/menu/banh-mi.jpg",
  },
  {
    name: "Vietnamese Coffee",
    description: "Slow-dripped dark roast with sweetened condensed milk, served over ice.",
    price: "$5.99",
    slug: "vietnamese-coffee",
    image: "/images/menu/vietnamese-coffee.jpg",
  },
  {
    name: "Spring Rolls",
    description: "Fresh rice paper rolls with shrimp, herbs, and vermicelli with peanut sauce.",
    price: "$9.99",
    slug: "spring-rolls",
    image: "/images/menu/spring-rolls.jpg",
  },
];

export function FeaturedDishes() {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-black">
            Signature Dishes
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full" />
          <p className="mt-4 text-gray-600 max-w-xl mx-auto">
            Explore our most-loved dishes, made fresh daily with authentic
            Vietnamese flavors.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED.map((dish) => (
            <Link key={dish.slug} href={`/menu/${dish.slug}`}>
              <Card className="group overflow-hidden hover:shadow-md transition-shadow h-full">
                <div className="aspect-square bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    {dish.name}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-display text-lg font-semibold group-hover:text-brand-red transition-colors">
                    {dish.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
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
