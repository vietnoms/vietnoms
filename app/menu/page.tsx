import type { Metadata } from "next";
import Link from "next/link";
import { getFullMenu } from "@/lib/menu-data";

export const revalidate = 3600;
import { MenuBrowser } from "@/components/menu-browser";
import { MenuPageSchema, BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { getMarketingSettings } from "@/lib/marketing/settings";
import { getBulkItemStats } from "@/lib/db/reviews";

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
  const [categories, settings] = await Promise.all([
    getFullMenu(),
    getMarketingSettings(),
  ]);

  // "Popular" badges: top 3 most-liked items
  let popularIds: string[] = [];
  try {
    const allIds = categories.flatMap((category) =>
      category.items.map((item) => item.id)
    );
    const stats = await getBulkItemStats(allIds);
    popularIds = Array.from(stats.entries())
      .filter(([, value]) => value.likeCount > 0)
      .sort((a, b) => b[1].likeCount - a[1].likeCount)
      .slice(0, 3)
      .map(([id]) => id);
  } catch {
    // stats are a nice-to-have — render the menu regardless
  }

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

      {categories.length === 0 ? (
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                Menu is being updated. Please check back soon or call us at{" "}
                {RESTAURANT.phone}.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <MenuBrowser
          categories={categories}
          popularIds={popularIds}
          staffPicks={settings.staffPicks}
          allergenNote={settings.allergenNote}
        />
      )}
    </>
  );
}
