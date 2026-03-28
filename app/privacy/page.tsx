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
        <p className="text-sm text-gray-400">Last updated: March 12, 2026</p>

        <h2>Information We Collect</h2>
        <p>
          When you place an order, purchase a gift card, submit a catering
          request, or check out through our website, we collect information
          necessary to fulfill your order, including your name, email address,
          phone number, and payment information.
        </p>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>
            Process and fulfill your orders, gift card purchases, and catering
            requests
          </li>
          <li>Send order confirmations and updates</li>
          <li>
            Enroll you in our Square Loyalty program to track your purchases and
            reward points (see Loyalty Program below)
          </li>
          <li>Verify your identity via one-time passcode (OTP) text messages</li>
          <li>Deliver gift cards via text message or email when requested</li>
          <li>Respond to your inquiries</li>
          <li>Improve our website and services</li>
          <li>Protect against fraud and abuse</li>
        </ul>

        <h2>Loyalty Program</h2>
        <p>
          When you check out on our website &mdash; whether placing an online
          order, purchasing a gift card, or submitting a catering request &mdash;
          your name, phone number, and email address will be used to create or
          look up your account in our Square Loyalty program. This allows us to
          track your purchases and award loyalty points automatically.
        </p>
        <p>
          You may view your points balance and available rewards through your
          account on our website. If you wish to opt out of the loyalty program,
          please contact us and we will remove your loyalty account.
        </p>

        <h2>SMS / Text Messaging</h2>
        <p>
          By providing your phone number and opting in, you consent to receive
          text messages from {RESTAURANT.name} for the following purposes:
        </p>
        <ul>
          <li>One-time verification codes (OTP) for account authentication</li>
          <li>Gift card delivery notifications</li>
        </ul>
        <p>
          These messages are transactional and are only sent when you initiate
          an action (e.g., signing in or purchasing a gift card for SMS
          delivery). Message and data rates may apply. Message frequency varies
          based on your activity.
        </p>
        <p>
          You may opt out at any time by replying <strong>STOP</strong> to any
          text message or by contacting us at{" "}
          <a href={`mailto:${RESTAURANT.email}`}>{RESTAURANT.email}</a>. For
          help, reply <strong>HELP</strong> or contact us at{" "}
          {RESTAURANT.phone}.
        </p>

        <h2>Mobile Information Protection</h2>
        <p>
          No mobile information will be shared with third parties/affiliates for
          marketing/promotional purposes. All the above categories exclude text
          messaging originator opt-in data and consent; this information will not
          be shared with any third parties.
        </p>

        <h2>Payment Security</h2>
        <p>
          All payments for online orders, gift cards, and catering are processed
          securely through Square. We do not store your credit card information
          on our servers. Square&apos;s security practices are PCI DSS Level 1
          compliant.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies and similar technologies to enhance your browsing
          experience, maintain your session, and analyze website traffic through
          Google Analytics.
        </p>

        <h2>Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li>
            <strong>Square</strong> &mdash; payment processing, loyalty
            programs, gift card management, and customer management
          </li>
          <li>
            <strong>Twilio</strong> &mdash; SMS delivery for OTP verification
            codes and gift card notifications
          </li>
          <li>
            <strong>Resend</strong> &mdash; transactional email delivery (order
            confirmations, receipts, gift card delivery)
          </li>
          <li>
            <strong>Google Analytics</strong> &mdash; website traffic analytics
          </li>
          <li>
            <strong>Google Maps</strong> &mdash; location and mapping services
          </li>
          <li>
            <strong>Google reCAPTCHA</strong> &mdash; fraud and abuse
            protection. Use of reCAPTCHA is subject to Google&apos;s{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>
          </li>
          <li>
            <strong>Turso</strong> &mdash; database hosting for reviews, likes,
            and customer data
          </li>
        </ul>
        <p>
          These services may collect and process data in accordance with their
          own privacy policies. We only share the minimum information necessary
          for each service to function.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your personal information for as long as necessary to
          provide our services, fulfill orders, and comply with legal
          obligations. Order history, loyalty program data, and account
          information are retained while your account is active. You may request
          deletion of your data at any time by contacting us.
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
