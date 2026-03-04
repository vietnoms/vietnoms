import type { Metadata } from "next";
import { getFullMenu } from "@/lib/menu-data";
import { OrderMenu } from "@/components/order/order-menu";
import { CartSidebar } from "@/components/order/cart-sidebar";
import { RESTAURANT } from "@/lib/constants";

export const revalidate = 3600;

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

        <div className="mt-8 grid lg:grid-cols-3 gap-8">
          {/* Menu section (2/3 width) */}
          <div className="lg:col-span-2">
            <OrderMenu categories={menuData} />
          </div>

          {/* Cart sidebar (1/3 width) */}
          <div className="lg:col-span-1">
            <CartSidebar />
          </div>
        </div>
      </div>
    </section>
  );
}
