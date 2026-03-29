import { unstable_cache } from "next/cache";
import { getSquare, toNumber, toDollars, LOCATION_ID } from "./square";
import { slugify } from "./utils";
import type { MenuItem, MenuCategory, MenuVariation, ModifierList } from "./types";

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

      // Fetch items with related objects (images, categories), paginating through all results
      const objects: any[] = [];
      const relatedObjects: any[] = [];
      let cursor: string | undefined;
      do {
        const response = await square.catalog.search({
          objectTypes: ["ITEM"],
          includeRelatedObjects: true,
          cursor,
        });
        objects.push(...(response?.objects || []));
        relatedObjects.push(...(response?.relatedObjects || []));
        cursor = response?.cursor;
      } while (cursor);

      // Build image map: imageId -> URL
      const imageMap = new Map<string, string>();
      // Build modifier list map: modifierListId -> ModifierList
      const modifierListMap = new Map<string, ModifierList>();
      for (const obj of relatedObjects) {
        if (obj.type === "IMAGE") {
          const url = (obj as any).imageData?.url;
          if (url) imageMap.set(obj.id!, url);
        } else if (obj.type === "MODIFIER_LIST") {
          const data = (obj as any).modifierListData;
          if (data) {
            modifierListMap.set(obj.id!, {
              id: obj.id!,
              name: data.name || "",
              selectionType: data.selectionType === "SINGLE" ? "SINGLE" : "MULTIPLE",
              minSelected: data.minSelectedModifiers != null ? Number(data.minSelectedModifiers) : undefined,
              maxSelected: data.maxSelectedModifiers != null ? Number(data.maxSelectedModifiers) : undefined,
              modifiers: ((data.modifiers || []) as any[]).map((m: any) => {
                const modData = m.modifierData;
                // Check sold-out status from modifier data or location overrides
                const modOverrides: any[] = modData?.locationOverrides || [];
                const modLocOverride = modOverrides.find(
                  (o: any) => o.locationId === LOCATION_ID
                );
                const modSoldOut = modData?.soldOut === true || modLocOverride?.soldOut === true;
                return {
                  id: m.id || "",
                  name: modData?.name || "",
                  price: toNumber(modData?.priceMoney?.amount),
                  formattedPrice: toDollars(modData?.priceMoney?.amount),
                  ...(modSoldOut ? { soldOut: true } : {}),
                };
              }),
            });
          }
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

            const varImageId = v.imageIds?.[0];

            return {
              id: v.id || "",
              name: varData?.name || "Regular",
              price: toNumber(price),
              formattedPrice: toDollars(price),
              imageUrl: varImageId ? (imageMap.get(varImageId) || null) : null,
              _soldOutOverride: soldOutOverride && !overrideExpired,
            } as MenuVariation & { _soldOutOverride: boolean };
          });

        rawItems.push({ item: itemData, obj, variations });
      }

      // Batch fetch inventory counts for all variations
      const soldOutItemIds = new Set<string>();
      const variationStockMap = new Map<string, number | null>();

      if (allVariationIds.length > 0 && LOCATION_ID) {
        try {
          const countsPage = await square.inventory.batchGetCounts({
            catalogObjectIds: allVariationIds,
            locationIds: [LOCATION_ID],
          });

          // Build a set of variation IDs that have inventory tracked and are at 0
          const trackedVariations = new Set<string>();
          for await (const count of countsPage) {
            if (count.catalogObjectId) {
              trackedVariations.add(count.catalogObjectId);
              const qty = parseFloat(count.quantity || "0");
              variationStockMap.set(count.catalogObjectId, Math.max(0, qty));
              if (qty <= 0) {
                const itemId = variationToItemId.get(count.catalogObjectId);
                if (itemId) soldOutItemIds.add(itemId);
              }
            }
          }

          // Untracked variations = null (unlimited)
          for (const varId of allVariationIds) {
            if (!trackedVariations.has(varId)) {
              variationStockMap.set(varId, null);
            }
          }
        } catch (invError) {
          // Inventory API may fail if not enabled — continue without it
          console.warn("Inventory check failed (may not be enabled):", invError);
        }
      }

      // Build per-variation sold-out map
      const variationSoldOutMap = new Map<string, boolean>();
      for (const { variations } of rawItems) {
        for (const v of variations as any[]) {
          const stock = variationStockMap.get(v.id);
          const overrideSoldOut = !!v._soldOutOverride;
          const inventorySoldOut = stock !== null && stock !== undefined && stock <= 0;
          variationSoldOutMap.set(v.id, overrideSoldOut || inventorySoldOut);
        }
      }

      // Filter by allowed category IDs if configured
      const allowedCategories = process.env.SQUARE_MENU_CATEGORY_IDS
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const filteredRawItems = allowedCategories?.length
        ? rawItems.filter(({ item }) => {
            const catIds = getCategoryIds(item);
            return catIds.some((id) => allowedCategories.includes(id));
          })
        : rawItems;

      // Build final items
      const items: MenuItem[] = filteredRawItems.map(({ item, obj, variations }) => {
        const cleanVariations = variations.map(
          ({ _soldOutOverride, ...v }: any) => ({
            ...v,
            stockQuantity: variationStockMap.get(v.id) ?? null,
            soldOut: variationSoldOutMap.get(v.id) ?? false,
          } as MenuVariation)
        );
        const basePrice = cleanVariations[0]?.price || 0;
        const imageId = item.imageIds?.[0];
        // Item is only sold out if ALL variations are sold out
        const soldOut = cleanVariations.length > 0 && cleanVariations.every((v) => v.soldOut);

        // Look up modifier lists for this item
        const itemModifierLists: ModifierList[] = [];
        const modListInfo = (item.modifierListInfo || []) as any[];
        for (const info of modListInfo) {
          const listId = info.modifierListId;
          if (listId) {
            const modList = modifierListMap.get(listId);
            if (modList) itemModifierLists.push(modList);
          }
        }

        const categoryIds = getCategoryIds(item);
        return {
          id: obj.id || "",
          name: item.name || "",
          slug: slugify(item.name || ""),
          description: item.description || "",
          price: basePrice,
          formattedPrice: cleanVariations[0]?.formattedPrice || "$0.00",
          categoryId: categoryIds[0] || "",
          categoryIds,
          categoryName: "",
          imageUrl: imageId ? (imageMap.get(imageId) || null) : null,
          variations: cleanVariations,
          modifierLists: itemModifierLists,
          dietaryLabels: parseDietaryLabels(item.description || "", item.name || ""),
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
  ["menu-items-v3"],
  { tags: ["menu"], revalidate: 300 }
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

      const allowedCategories = process.env.SQUARE_MENU_CATEGORY_IDS
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const categories = allObjects
        .filter((obj: any) => obj.type === "CATEGORY")
        .filter((obj: any) => !allowedCategories?.length || allowedCategories.includes(obj.id))
        .map((obj: any, index: number) => {
          const catData = obj.categoryData;
          // Use position in env var as ordinal if configured, otherwise API order
          const envIndex = allowedCategories?.indexOf(obj.id) ?? -1;
          return {
            id: obj.id || "",
            name: catData?.name || "",
            slug: slugify(catData?.name || ""),
            ordinal: envIndex >= 0 ? envIndex : index,
            items: [],
          };
        });
      return categories;
    } catch (error) {
      console.error("Failed to fetch categories from Square:", error);
      return [];
    }
  },
  ["menu-categories-v3"],
  { tags: ["menu"], revalidate: 300 }
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
    for (const catId of item.categoryIds) {
      const category = categoryMap.get(catId);
      if (category) {
        // Clone item with this category's info so each category gets its own copy
        const catItem = { ...item, categoryId: catId, categoryName: category.name };
        category.items.push(catItem);
      }
    }
    // Fallback: if no categoryIds matched, try the legacy categoryId
    if (item.categoryIds.length === 0) {
      const category = categoryMap.get(item.categoryId);
      if (category) {
        item.categoryName = category.name;
        category.items.push(item);
      }
    }
  }

  return categories
    .filter((c) => c.items.length > 0)
    .sort((a, b) => a.ordinal - b.ordinal);
}

/** Extracts all category IDs from a Square item (multi-category + legacy fallback) */
function getCategoryIds(item: any): string[] {
  const ids: string[] = [];
  if (item.categories?.length) {
    for (const c of item.categories) {
      if (c.id) ids.push(c.id);
    }
  }
  // Include legacy categoryId if not already present
  if (item.categoryId && !ids.includes(item.categoryId)) {
    ids.unshift(item.categoryId);
  }
  return ids;
}

/** Name-based label overrides for specific items */
const ITEM_LABEL_MAP: Record<string, string[]> = {
  // Vegan menu items — Vegan + Vegetarian
  "Vegancelli": ["Vegan", "Vegetarian"],
  "Vegarice": ["Vegan", "Vegetarian"],
  "Vegan Salad": ["Vegan", "Vegetarian"],
  "Vegan Banh Mi (NO MAYO)": ["Vegan", "Vegetarian"],
  "Vegan Egg Roll (1)": ["Vegan", "Vegetarian"],

  // Classic Noms — can be made Vegan/Vegetarian
  "Bun Bowl (vermicelli noodle)": ["Fan Favorite", "Vegan Option", "Vegetarian Option"],
  "Rice bowl": ["Vegan Option", "Vegetarian Option"],
  "Salad Bowl": ["Vegan Option", "Vegetarian Option"],
  "Banh Mi": ["Vegan Option", "Vegetarian Option"],

  // Special items
  "Hell Yea (Heo Gà) Bowl": ["Customer Favorite"],
  "The Big Classic": ["Customer Favorite"],
  "Our GF (Gluten-Free)": ["Gluten-Free"],

  // Sides
  "Side of Stir-Fried Tofu": ["Vegan", "Vegetarian"],
  "Side of Red Hot Beef": ["Spicy", "Gluten-Free"],

  // Egg rolls
  "Pork & Shrimp Egg Roll (1)": [],
  "1x Shrimp Egg roll": [],
};

/** Generates dietary/feature labels for menu items */
function parseDietaryLabels(description: string, itemName?: string): string[] {
  // Use name-based overrides if available
  if (itemName && ITEM_LABEL_MAP[itemName]) {
    return ITEM_LABEL_MAP[itemName];
  }

  // Fallback: parse from description text
  const labels: string[] = [];
  const lower = description.toLowerCase();
  if (lower.includes("vegan") || lower.includes("(vg)")) labels.push("Vegan");
  if (lower.includes("vegetarian") || lower.includes("(v)") || lower.includes("veggie")) labels.push("Vegetarian");
  if (lower.includes("gluten-free") || lower.includes("(gf)")) labels.push("Gluten-Free");
  if (lower.includes("spicy")) labels.push("Spicy");
  return labels;
}
