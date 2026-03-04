import { unstable_cache } from "next/cache";
import { getSquare, toNumber, toDollars, LOCATION_ID } from "./square";
import { slugify } from "./utils";
import type { MenuItem, MenuCategory, MenuVariation } from "./types";

/**
 * Fetches all menu items from Square Catalog API.
 * Uses catalog.search with includeRelatedObjects to batch-fetch images.
 * Checks inventory counts and sold-out overrides for availability.
 * Wrapped in unstable_cache with "menu" tag for on-demand revalidation via webhooks.
 */
export const getMenuItems = unstable_cache(
  async (): Promise<MenuItem[]> => {
    try {
      const square = getSquare();

      // Fetch items with related objects (images, categories) in a single call
      const response = await square.catalog.search({
        objectTypes: ["ITEM"],
        includeRelatedObjects: true,
      });

      const objects = response?.objects || [];
      const relatedObjects = response?.relatedObjects || [];

      // Build image map: imageId -> URL
      const imageMap = new Map<string, string>();
      for (const obj of relatedObjects) {
        if (obj.type === "IMAGE") {
          const url = (obj as any).imageData?.url;
          if (url) imageMap.set(obj.id!, url);
        }
      }

      // Collect all variation IDs for inventory check
      const allVariationIds: string[] = [];
      const variationToItemId = new Map<string, string>();

      const rawItems: {
        item: any;
        obj: any;
        variations: MenuVariation[];
      }[] = [];

      for (const obj of objects) {
        if (obj.type !== "ITEM") continue;
        const itemData = (obj as any).itemData;
        if (!itemData) continue;

        const variations: MenuVariation[] = ((itemData.variations || []) as any[])
          .filter((v: any) => v.type === "ITEM_VARIATION")
          .map((v: any) => {
            const varData = v.itemVariationData;
            const price = varData?.priceMoney?.amount;

            // Track variation for inventory lookup
            if (v.id) {
              allVariationIds.push(v.id);
              variationToItemId.set(v.id, obj.id!);
            }

            // Check sold_out in location overrides
            const overrides: any[] = varData?.locationOverrides || [];
            const locationOverride = overrides.find(
              (o: any) => o.locationId === LOCATION_ID
            );
            const soldOutOverride = locationOverride?.soldOut === true;
            // Check if soldOutValidUntil has passed
            const validUntil = locationOverride?.soldOutValidUntil;
            const overrideExpired = validUntil && new Date(validUntil) < new Date();

            return {
              id: v.id || "",
              name: varData?.name || "Regular",
              price: toNumber(price),
              formattedPrice: toDollars(price),
              _soldOutOverride: soldOutOverride && !overrideExpired,
            } as MenuVariation & { _soldOutOverride: boolean };
          });

        rawItems.push({ item: itemData, obj, variations });
      }

      // Batch fetch inventory counts for all variations
      const soldOutItemIds = new Set<string>();

      if (allVariationIds.length > 0 && LOCATION_ID) {
        try {
          const countsPage = await square.inventory.batchGetCounts({
            catalogObjectIds: allVariationIds,
            locationIds: [LOCATION_ID],
            states: ["IN_STOCK"],
          });

          // Build a set of variation IDs that have inventory tracked and are at 0
          const trackedVariations = new Set<string>();
          for await (const count of countsPage) {
            if (count.catalogObjectId) {
              trackedVariations.add(count.catalogObjectId);
              const qty = parseFloat(count.quantity || "0");
              if (qty <= 0) {
                const itemId = variationToItemId.get(count.catalogObjectId);
                if (itemId) soldOutItemIds.add(itemId);
              }
            }
          }
        } catch (invError) {
          // Inventory API may fail if not enabled — continue without it
          console.warn("Inventory check failed (may not be enabled):", invError);
        }
      }

      // Also check sold_out overrides from variations
      for (const { obj, variations } of rawItems) {
        const hasOverride = (variations as any[]).some(
          (v: any) => v._soldOutOverride
        );
        if (hasOverride) {
          soldOutItemIds.add(obj.id!);
        }
      }

      // Build final items
      const items: MenuItem[] = rawItems.map(({ item, obj, variations }) => {
        const cleanVariations = variations.map(
          ({ _soldOutOverride, ...v }: any) => v as MenuVariation
        );
        const basePrice = cleanVariations[0]?.price || 0;
        const imageId = item.imageIds?.[0];
        const soldOut = soldOutItemIds.has(obj.id!);

        return {
          id: obj.id || "",
          name: item.name || "",
          slug: slugify(item.name || ""),
          description: item.description || "",
          price: basePrice,
          formattedPrice: cleanVariations[0]?.formattedPrice || "$0.00",
          categoryId: item.categoryId || item.categories?.[0]?.id || "",
          categoryName: "",
          imageUrl: imageId ? (imageMap.get(imageId) || null) : null,
          variations: cleanVariations,
          modifierLists: [],
          dietaryLabels: parseDietaryLabels(item.description || ""),
          available: !soldOut && !(item.isArchived || item.isDeleted),
          soldOut,
        };
      });

      return items;
    } catch (error) {
      console.error("Failed to fetch menu items from Square:", error);
      return [];
    }
  },
  ["menu-items-v2"],
  { tags: ["menu"], revalidate: 3600 }
);

/**
 * Fetches menu categories from Square Catalog API.
 */
export const getMenuCategories = unstable_cache(
  async (): Promise<MenuCategory[]> => {
    try {
      const square = getSquare();
      const page = await square.catalog.list({ types: "CATEGORY" });

      const allObjects = page?.data || [];

      return allObjects
        .filter((obj: any) => obj.type === "CATEGORY")
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
  },
  ["menu-categories-v2"],
  { tags: ["menu"], revalidate: 3600 }
);

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

  for (const item of items) {
    const category = categoryMap.get(item.categoryId);
    if (category) {
      item.categoryName = category.name;
      category.items.push(item);
    }
  }

  return categories
    .filter((c) => c.items.length > 0)
    .sort((a, b) => a.ordinal - b.ordinal);
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
