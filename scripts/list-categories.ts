/**
 * Lists all Square catalog categories with their IDs and item counts.
 * Run: npx tsx scripts/list-categories.ts
 * Requires SQUARE_ACCESS_TOKEN and SQUARE_ENVIRONMENT env vars.
 */
import { SquareClient, SquareEnvironment } from "square";

async function main() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    console.error("Set SQUARE_ACCESS_TOKEN env var");
    process.exit(1);
  }

  const square = new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });

  // Fetch all categories
  const catPage = await square.catalog.list({ types: "CATEGORY" });
  const categories = (catPage?.data || []).filter(
    (obj: any) => obj.type === "CATEGORY"
  );

  // Fetch all items (paginated) to count per category
  const items: any[] = [];
  let cursor: string | undefined;
  do {
    const response = await square.catalog.search({
      objectTypes: ["ITEM"],
      cursor,
    });
    items.push(...((response?.objects || []).filter((obj: any) => obj.type === "ITEM")));
    cursor = response?.cursor;
  } while (cursor);

  // Count items per category (items can appear in multiple categories)
  const counts = new Map<string, number>();
  const multiCatItems: string[] = [];
  for (const obj of items) {
    const itemData = (obj as any).itemData;
    const catIds: string[] = [];
    if (itemData?.categories?.length) {
      for (const c of itemData.categories) {
        if (c.id) catIds.push(c.id);
      }
    }
    if (itemData?.categoryId && !catIds.includes(itemData.categoryId)) {
      catIds.unshift(itemData.categoryId);
    }
    for (const catId of catIds) {
      counts.set(catId, (counts.get(catId) || 0) + 1);
    }
    if (catIds.length > 1) {
      multiCatItems.push(`${itemData?.name} (${catIds.length} categories)`);
    }
  }

  console.log("\n=== Square Catalog Categories ===\n");
  console.log(
    `${"Category Name".padEnd(35)} ${"ID".padEnd(30)} Items`
  );
  console.log("-".repeat(75));

  for (const cat of categories) {
    const name = (cat as any).categoryData?.name || "(unnamed)";
    const id = cat.id || "";
    const count = counts.get(id) || 0;
    console.log(`${name.padEnd(35)} ${id.padEnd(30)} ${count}`);
  }

  console.log(`\nTotal: ${categories.length} categories, ${items.length} items`);

  if (multiCatItems.length > 0) {
    console.log(`\n=== Multi-Category Items (${multiCatItems.length}) ===`);
    for (const name of multiCatItems) {
      console.log(`  - ${name}`);
    }
  }

  console.log(
    "\nCopy the IDs you want on the website and set:\n" +
      "  SQUARE_MENU_CATEGORY_IDS=ID1,ID2,ID3\n"
  );
}

main().catch(console.error);
