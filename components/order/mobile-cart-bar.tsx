"use client";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

export function MobileCartBar() {
  const { items, total, itemCount, openCart, openCheckout } = useCart();

  if (items.length === 0) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-alt border-t border-gray-700/50 shadow-lg">
      <button
        onClick={() => { openCart(); openCheckout(); }}
        className="flex items-center justify-between px-4 py-3 mx-4 my-2 bg-brand-red text-white rounded-full w-[calc(100%-2rem)]"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          <span className="font-semibold text-sm">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        <span className="font-bold">{formatPrice(total)}</span>
      </button>
    </div>
  );
}
