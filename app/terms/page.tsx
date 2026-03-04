import type { Metadata } from "next";
import { RESTAURANT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for ${RESTAURANT.name}.`,
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-gray">
        <h1 className="font-display">Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: March 2026</p>

        <h2>Ordering</h2>
        <p>
          By placing an order through our website, you agree to provide accurate
          and complete information. All orders are subject to availability.
        </p>

        <h2>Pricing</h2>
        <p>
          Prices listed on our website are subject to change without notice.
          Applicable taxes will be added at checkout.
        </p>

        <h2>Cancellations & Refunds</h2>
        <p>
          Orders may be cancelled within 5 minutes of placement by contacting us
          at {RESTAURANT.phone}. Refunds for cancelled orders will be processed
          to the original payment method within 5–10 business days.
        </p>

        <h2>Gift Cards</h2>
        <p>
          Gift cards purchased through our website are non-refundable and do not
          expire. Gift cards may be redeemed for food and beverages at our
          restaurant or through online orders.
        </p>

        <h2>Catering</h2>
        <p>
          Catering orders require a minimum 48-hour advance notice. Cancellations
          made less than 24 hours before the event may be subject to a
          cancellation fee.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All content on this website, including text, images, logos, and design,
          is the property of {RESTAURANT.name} and may not be reproduced without
          permission.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Contact us at{" "}
          <a href={`mailto:${RESTAURANT.email}`}>{RESTAURANT.email}</a>.
        </p>
      </div>
    </section>
  );
}
