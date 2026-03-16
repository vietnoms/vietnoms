import type { Metadata } from "next";
import { getFullMenu } from "@/lib/menu-data";
import { OrderMenu } from "@/components/order/order-menu";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Order Online | Vietnamese Food Pickup",
  description: "Order Vietnamese food online from Vietnoms for pickup. Bun bowls, banh mi, wings & more in San Jose.",
};

export default async function OrderPage() {
  const categories = await getFullMenu();

  return <OrderMenu categories={categories} />;
}
