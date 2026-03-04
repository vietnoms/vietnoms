import type { Metadata } from "next";
import { RESTAURANT } from "@/lib/constants";
import { formatPhoneForTel } from "@/lib/utils";
import { BreadcrumbSchema } from "@/components/schema-markup";
import { MapPin, Phone, Clock, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Vietnoms | Vietnamese Restaurant San Jose",
  description: `Visit Vietnoms at ${RESTAURANT.address.full}. Call ${RESTAURANT.phone} for reservations, takeout, or catering inquiries.`,
  openGraph: {
    title: "Contact Vietnoms",
    description: `Visit us at ${RESTAURANT.address.full}. Call ${RESTAURANT.phone} for reservations or takeout.`,
  },
};

export default function ContactPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Contact", url: `${RESTAURANT.url}/contact` },
        ]}
      />

      {/* Hero */}
      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Contact Us
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            We&apos;d love to hear from you. Stop by, give us a call, or send us
            a message.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Map */}
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-200">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=YOUR_MAPS_API_KEY&q=${encodeURIComponent(RESTAURANT.address.full)}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Vietnoms Location"
              />
            </div>

            {/* Contact Details */}
            <div className="space-y-8">
              <div className="flex gap-4">
                <MapPin className="h-6 w-6 text-brand-red flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-lg">Address</h2>
                  <p className="text-gray-600 mt-1">
                    {RESTAURANT.address.street}
                    <br />
                    {RESTAURANT.address.city}, {RESTAURANT.address.state}{" "}
                    {RESTAURANT.address.zip}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(RESTAURANT.address.full)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-red text-sm hover:underline mt-1 inline-block"
                  >
                    Get Directions &rarr;
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone className="h-6 w-6 text-brand-red flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-lg">Phone</h2>
                  <a
                    href={formatPhoneForTel(RESTAURANT.phone)}
                    className="text-gray-600 mt-1 hover:text-brand-red transition-colors block"
                  >
                    {RESTAURANT.phone}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <Mail className="h-6 w-6 text-brand-red flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-lg">Email</h2>
                  <a
                    href={`mailto:${RESTAURANT.email}`}
                    className="text-gray-600 mt-1 hover:text-brand-red transition-colors block"
                  >
                    {RESTAURANT.email}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock className="h-6 w-6 text-brand-red flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-lg">Hours</h2>
                  <ul className="mt-1 space-y-1">
                    {RESTAURANT.hours.map((h) => (
                      <li key={h.days} className="text-gray-600">
                        <span className="font-medium text-gray-800">
                          {h.days}:
                        </span>{" "}
                        {h.open} – {h.close}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
