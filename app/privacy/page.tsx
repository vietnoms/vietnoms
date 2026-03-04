import type { Metadata } from "next";
import { RESTAURANT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${RESTAURANT.name}.`,
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-gray">
        <h1 className="font-display">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: March 2026</p>

        <h2>Information We Collect</h2>
        <p>
          When you place an order through our website, we collect information
          necessary to fulfill your order, including your name, email address,
          phone number, and payment information.
        </p>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Send order confirmations and updates</li>
          <li>Respond to your inquiries</li>
          <li>Improve our website and services</li>
        </ul>

        <h2>Payment Security</h2>
        <p>
          All payments are processed securely through Square. We do not store
          your credit card information on our servers. Square&apos;s security
          practices are PCI DSS Level 1 compliant.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies and similar technologies to enhance your browsing
          experience and analyze website traffic through Google Analytics.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          We use the following third-party services: Square (payment processing),
          Google Analytics (website analytics), and Google Maps (location
          services).
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this privacy policy, please contact us at{" "}
          <a href={`mailto:${RESTAURANT.email}`}>{RESTAURANT.email}</a> or call{" "}
          {RESTAURANT.phone}.
        </p>
      </div>
    </section>
  );
}
