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

  // Fetch all items to count per category
  const itemResponse = await square.catalog.search({
    objectTypes: ["ITEM"],
  });
  const items = (itemResponse?.objects || []).filter(
    (obj: any) => obj.type === "ITEM"
  );

  // Count items per category
  const counts = new Map<string, number>();
  for (const obj of items) {
    const catId =
      (obj as any).itemData?.categoryId ||
      (obj as any).itemData?.categories?.[0]?.id ||
      "";
    if (catId) counts.set(catId, (counts.get(catId) || 0) + 1);
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
  console.log(
    "\nCopy the IDs you want on the website and set:\n" +
      "  SQUARE_MENU_CATEGORY_IDS=ID1,ID2,ID3\n"
  );
}

main().catch(console.error);
