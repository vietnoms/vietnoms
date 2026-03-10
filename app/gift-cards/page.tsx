import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { GiftCardForm } from "@/components/gift-card-form";
import { GiftCardBalance } from "@/components/gift-card-balance";

export const metadata: Metadata = {
  title: "Gift Cards | Vietnoms Vietnamese Restaurant",
  description:
    "Give the gift of authentic Vietnamese food. Purchase a Vietnoms digital gift card for friends and family. Available in $25, $50, $75, and $100 amounts.",
  openGraph: {
    title: "Gift Cards | Vietnoms",
    description:
      "Give the gift of Vietnamese food. Purchase a digital gift card.",
  },
};

export default function GiftCardsPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Gift Cards", url: `${RESTAURANT.url}/gift-cards` },
        ]}
      />

      {/* Hero */}
      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Gift Cards
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            Share the love of Vietnamese food. Send a digital gift card to
            friends and family.
          </p>
        </div>
      </section>

      {/* Gift Card Form */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <GiftCardForm />
        </div>
      </section>

      {/* Balance Check */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <GiftCardBalance />
        </div>
      </section>
    </>
  );
}
