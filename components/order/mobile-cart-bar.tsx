"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

export function MobileCartBar() {
  const { items, total, itemCount } = useCart();

  if (items.length === 0) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <Link
        href="/order/checkout"
        className="flex items-center justify-between px-4 py-3 mx-4 my-2 bg-brand-red text-white rounded-full"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          <span className="font-semibold text-sm">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        <span className="font-bold">{formatPrice(total)}</span>
      </Link>
    </div>
  );
}
