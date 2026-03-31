import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMenuItems, getMenuItemBySlug } from "@/lib/menu-data";
import { getItemStats } from "@/lib/db/reviews";
import { getLikeCount } from "@/lib/db/likes";
import { MenuItemSchema, BreadcrumbSchema } from "@/components/schema-markup";
import { Badge, labelVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RESTAURANT } from "@/lib/constants";
import { ItemPageClient } from "@/components/order/item-page-client";
import { ItemReviews } from "@/components/order/item-reviews";

export const dynamicParams = true;

export async function generateStaticParams() {
  const items = await getMenuItems();
  return items.map((item) => ({ slug: item.slug }));
}

async function getMenuItemContent(_itemId: string): Promise<{ story?: string; seoDescription?: string } | null> {
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const item = await getMenuItemBySlug(params.slug);
  if (!item) return { title: "Menu Item Not Found" };

  const content = await getMenuItemContent(item.id);
  const description =
    content?.seoDescription ||
    item.description ||
    `Order ${item.name} from Vietnoms — authentic Vietnamese cuisine in San Jose. ${item.formattedPrice}.`;

  return {
    title: `${item.name} | Vietnoms Menu`,
    description,
    openGraph: {
      title: `${item.name} | Vietnoms`,
      description,
      images: item.imageUrl ? [{ url: item.imageUrl }] : undefined,
    },
  };
}

export default async function MenuItemPage({
  params,
}: {
  params: { slug: string };
}) {
  const item = await getMenuItemBySlug(params.slug);
  if (!item) notFound();

  const content = await getMenuItemContent(item.id);

  // Fetch review/like stats
  let itemStats = { averageRating: 0, reviewCount: 0, likeCount: 0 };
  try {
    const [reviewStats, likeCount] = await Promise.all([
      getItemStats(item.id),
      getLikeCount(item.id),
    ]);
    itemStats = {
      averageRating: reviewStats.averageRating,
      reviewCount: reviewStats.reviewCount,
      likeCount,
    };
  } catch {
    // Turso not configured or unavailable
  }

  return (
    <>
      <MenuItemSchema
        name={item.name}
        description={item.description}
        image={item.imageUrl}
        price={item.formattedPrice}
        slug={item.slug}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Menu", url: `${RESTAURANT.url}/menu` },
          { name: item.name, url: `${RESTAURANT.url}/menu/${item.slug}` },
        ]}
      />

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-gray-400">
            <Link href="/" className="hover:text-brand-red">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/menu" className="hover:text-brand-red">
              Menu
            </Link>{" "}
            / <span className="text-white">{item.name}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <ItemPageClient item={item}>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                {item.name}
              </h1>

              {item.dietaryLabels.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {item.dietaryLabels.map((label) => (
                    <Badge key={label} variant={labelVariant(label)}>
                      {label}
                    </Badge>
                  ))}
                </div>
              )}

              {item.description && (
                <p className="mt-4 text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )}

              {content?.story && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                  <h3 className="font-display text-sm font-bold text-amber-900 mb-1">The Story</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">{content.story}</p>
                </div>
              )}


              <div className="mt-8 border-t border-gray-100 pt-6">
                <ItemReviews itemId={item.id} initialStats={itemStats} />
              </div>

              <div className="mt-4">
                <Button asChild size="lg" variant="outline">
                  <Link href="/menu">Back to Menu</Link>
                </Button>
              </div>

              {item.categoryName && (
                <p className="mt-6 text-sm text-gray-400">
                  Category: {item.categoryName}
                </p>
              )}
            </ItemPageClient>
          </div>
        </div>
      </section>
    </>
  );
}
