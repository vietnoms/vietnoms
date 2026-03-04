import type { Metadata } from "next";
import { getFullMenu } from "@/lib/menu-data";
import { getBulkItemStats } from "@/lib/db/reviews";

export const revalidate = 3600;
import { OrderMenu } from "@/components/order/order-menu";
import { CartSidebar } from "@/components/order/cart-sidebar";
import { MobileCartBar } from "@/components/order/mobile-cart-bar";
import { RESTAURANT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Order Online | Vietnamese Food Pickup",
  description: `Order Vietnamese food online from Vietnoms for pickup. Fresh pho, banh mi, and more in San Jose. Call ${RESTAURANT.phone}.`,
  openGraph: {
    title: "Order Online | Vietnoms",
    description: "Order authentic Vietnamese food online for pickup in San Jose.",
  },
};

export default async function OrderPage() {
  const categories = await getFullMenu();

  // Collect all item IDs for bulk stats fetch
  const allItemIds = categories.flatMap((cat) => cat.items.map((item) => item.id));

  // Fetch item stats (reviews + likes) — gracefully handle if Turso isn't configured
  let itemStats: Record<string, { averageRating: number; reviewCount: number; likeCount: number }> = {};
  try {
    const statsMap = await getBulkItemStats(allItemIds);
    itemStats = Object.fromEntries(statsMap);
  } catch {
    // Turso not configured yet — continue without stats
  }

  // Serialize menu data to pass to client components (BigInt already converted)
  const menuData = categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({
      ...item,
    })),
  }));

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-black">
          Order Online
        </h1>
        <p className="mt-2 text-gray-600">
          Build your order and pick it up fresh.
        </p>

        <div className="mt-8 flex gap-8">
          {/* Menu section (flexible width) */}
          <div className="flex-1 min-w-0">
            <OrderMenu categories={menuData} itemStats={itemStats} />
          </div>

          {/* Cart sidebar (fixed width, desktop only) */}
          <div className="hidden lg:block w-80 shrink-0">
            <CartSidebar />
          </div>
        </div>
      </div>

      {/* Mobile sticky cart bar */}
      <MobileCartBar />
    </section>
  );
}
