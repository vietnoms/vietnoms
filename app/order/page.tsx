import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order Online | Vietnamese Food Pickup",
  description: "Order Vietnamese food online from Vietnoms for pickup. Bun bowls, banh mi, wings & more in San Jose.",
};

export default function OrderPage() {
  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Order Online
        </h1>
        <div className="mt-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6">
          <p className="text-lg text-yellow-200 font-semibold">
            Online ordering is temporarily disabled.
          </p>
          <p className="mt-2 text-gray-400">
            Our website is currently undergoing construction. Please call us to place an order.
          </p>
          <a
            href="tel:+14088275812"
            className="mt-4 inline-block rounded-lg bg-brand-red px-6 py-3 font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Call (408) 827-5812
          </a>
        </div>
        <Link href="/" className="mt-6 inline-block text-sm text-gray-400 hover:text-white transition-colors">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
