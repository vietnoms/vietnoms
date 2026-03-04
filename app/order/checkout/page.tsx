import type { Metadata } from "next";
import { CheckoutForm } from "@/components/order/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-black">
          Checkout
        </h1>
        <div className="mt-8">
          <CheckoutForm />
        </div>
      </div>
    </section>
  );
}
