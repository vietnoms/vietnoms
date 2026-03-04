import { getSquare, toNumber, toDollars } from "./square";
import { slugify } from "./utils";
import type { MenuItem, MenuCategory, MenuVariation, ModifierList } from "./types";

/**
 * Fetches all menu items from Square Catalog API.
 * Converts BigInt values to numbers before returning.
 */
export async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const square = getSquare();
    const page = await square.catalog.list({ types: "ITEM" });

    if (!page?.data) return [];

    const items: MenuItem[] = [];

    for (const obj of page.data) {
      if (obj.type !== "ITEM") continue;

      const itemData = (obj as any).itemData;
      if (!itemData) continue;
      // Square SDK v44 types: variations are CatalogObject[] union — cast to access ITEM_VARIATION data
      const variations: MenuVariation[] = ((itemData.variations || []) as any[])
        .filter((v: any) => v.type === "ITEM_VARIATION")
        .map((v: any) => {

          const varData = v.itemVariationData;
          const price = varData?.priceMoney?.amount;
          return {
            id: v.id || "",
            name: varData?.name || "Regular",
            price: toNumber(price),
            formattedPrice: toDollars(price),
          };
        });

      const basePrice = variations[0]?.price || 0;

      items.push({
        id: obj.id || "",
        name: itemData.name || "",
        slug: slugify(itemData.name || ""),
        description: itemData.description || "",
        price: basePrice,
        formattedPrice: variations[0]?.formattedPrice || "$0.00",
        categoryId: itemData.categoryId || "",
        categoryName: "", // resolved below
        imageUrl: itemData.imageIds?.[0]
          ? await getImageUrl(itemData.imageIds[0])
          : null,
        variations,
        modifierLists: [], // TODO: fetch modifier lists if needed
        dietaryLabels: parseDietaryLabels(itemData.description || ""),
        available: !itemData.isTaxable, // Square doesn't have "available" — use item visibility
      });
    }

    return items;
  } catch (error) {
    console.error("Failed to fetch menu items from Square:", error);
    return [];
  }
}

/**
 * Fetches menu categories from Square Catalog API.
 */
export async function getMenuCategories(): Promise<MenuCategory[]> {
  try {
    const square = getSquare();
    const page = await square.catalog.list({ types: "CATEGORY" });

    if (!page?.data) return [];

    return page.data
      .filter((obj) => obj.type === "CATEGORY")
      .map((obj: any, index: number) => {

        const catData = obj.categoryData;
        return {
          id: obj.id || "",
          name: catData?.name || "",
          slug: slugify(catData?.name || ""),
          ordinal: index,
          items: [],
        };
      });
  } catch (error) {
    console.error("Failed to fetch categories from Square:", error);
    return [];
  }
}

/**
 * Gets a single menu item by its slug.
 */
export async function getMenuItemBySlug(
  slug: string
): Promise<MenuItem | null> {
  const items = await getMenuItems();
  return items.find((item) => item.slug === slug) || null;
}

/**
 * Returns fully populated menu with items grouped by category.
 */
export async function getFullMenu(): Promise<MenuCategory[]> {
  const [items, categories] = await Promise.all([
    getMenuItems(),
    getMenuCategories(),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Assign items to categories
  for (const item of items) {
    const category = categoryMap.get(item.categoryId);
    if (category) {
      item.categoryName = category.name;
      category.items.push(item);
    }
  }

  // Return only categories with items, sorted by ordinal
  return categories
    .filter((c) => c.items.length > 0)
    .sort((a, b) => a.ordinal - b.ordinal);
}

/** Fetches the image URL for a Square catalog image object */
async function getImageUrl(imageId: string): Promise<string | null> {
  try {
    const square = getSquare();
    const response = await square.catalog.batchGet({ objectIds: [imageId] });
    const imageObj = response?.objects?.[0] as any;
    return imageObj?.imageData?.url || null;
  } catch {
    return null;
  }
}

/** Parses dietary labels from item description text */
function parseDietaryLabels(description: string): string[] {
  const labels: string[] = [];
  const lower = description.toLowerCase();
  if (lower.includes("vegan") || lower.includes("(vg)")) labels.push("VG");
  if (
    lower.includes("vegetarian") ||
    lower.includes("(v)") ||
    lower.includes("veggie")
  )
    labels.push("V");
  if (lower.includes("gluten-free") || lower.includes("(gf)"))
    labels.push("GF");
  if (lower.includes("spicy")) labels.push("Spicy");
  return labels;
}
