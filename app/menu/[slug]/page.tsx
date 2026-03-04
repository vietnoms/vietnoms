import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMenuItems, getMenuItemBySlug } from "@/lib/menu-data";
import { MenuItemSchema, BreadcrumbSchema } from "@/components/schema-markup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RESTAURANT } from "@/lib/constants";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const items = await getMenuItems();
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const item = await getMenuItemBySlug(params.slug);
  if (!item) return { title: "Menu Item Not Found" };

  return {
    title: `${item.name} | Vietnoms Menu`,
    description:
      item.description ||
      `Order ${item.name} from Vietnoms — authentic Vietnamese cuisine in San Jose. ${item.formattedPrice}.`,
    openGraph: {
      title: `${item.name} | Vietnoms`,
      description:
        item.description || `${item.name} — ${item.formattedPrice}`,
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
          <nav className="mb-8 text-sm text-gray-500">
            <Link href="/" className="hover:text-brand-red">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/menu" className="hover:text-brand-red">
              Menu
            </Link>{" "}
            / <span className="text-gray-900">{item.name}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image */}
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  {item.name}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-black">
                {item.name}
              </h1>

              {item.dietaryLabels.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {item.dietaryLabels.map((label) => (
                    <Badge
                      key={label}
                      variant={
                        label === "VG" || label === "V"
                          ? "vegan"
                          : label === "GF"
                            ? "gf"
                            : label === "Spicy"
                              ? "spicy"
                              : "secondary"
                      }
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="mt-4 text-2xl font-bold text-brand-red">
                {item.formattedPrice}
              </p>

              {item.description && (
                <p className="mt-4 text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Variations */}
              {item.variations.length > 1 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">
                    Options
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {item.variations.map((v) => (
                      <span
                        key={v.id}
                        className="px-3 py-1.5 rounded-full border border-gray-200 text-sm"
                      >
                        {v.name} — {v.formattedPrice}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="xl">
                  <Link href="/order">Order This Item</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/menu">Back to Menu</Link>
                </Button>
              </div>

              {item.categoryName && (
                <p className="mt-6 text-sm text-gray-400">
                  Category: {item.categoryName}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
