import type { Metadata } from "next";
import Link from "next/link";
import { getFullMenu } from "@/lib/menu-data";

export const revalidate = 3600;
import { MenuItemCard } from "@/components/menu-item-card";
import { MenuPageSchema, BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Menu | Bun Bowls, Wings, Banh Mi & Vietnamese Coffee",
  description:
    "Explore the full Vietnoms menu — bun bowls, wings, banh mi, rice bowls, Vietnamese coffee, and more. Fresh, authentic Vietnamese cuisine in San Jose.",
  openGraph: {
    title: "Vietnoms Menu | Bun Bowls, Wings, Banh Mi | San Jose",
    description:
      "Explore our full menu of authentic Vietnamese dishes. Order online for pickup.",
  },
};

export default async function MenuPage() {
  const categories = await getFullMenu();

  return (
    <>
      <MenuPageSchema />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Menu", url: `${RESTAURANT.url}/menu` },
        ]}
      />

      {/* Hero */}
      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Our Menu
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            Authentic Vietnamese dishes made fresh daily. Click any item for
            details, or{" "}
            <Link href="/order" className="text-brand-yellow hover:underline">
              order online
            </Link>{" "}
            for pickup.
          </p>
        </div>
      </section>

      {/* Category Anchor Nav */}
      {categories.length > 0 && (
        <nav className="sticky top-16 z-40 bg-surface-alt/90 backdrop-blur-lg border-b border-gray-800/50 overflow-x-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-6 py-3">
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`#${cat.slug}`}
                  className="text-sm font-medium text-gray-400 hover:text-brand-red whitespace-nowrap transition-colors"
                >
                  {cat.name}
                </a>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Menu Categories */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          {categories.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                Menu is being updated. Please check back soon or call us at{" "}
                {RESTAURANT.phone}.
              </p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} id={category.slug}>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
                  {category.name}
                </h2>
                <div className="mt-1 h-1 w-12 bg-brand-red rounded-full" />
                <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
