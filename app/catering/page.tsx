import type { Metadata } from "next";
import { ServiceSchema, BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { CateringForm } from "@/components/catering-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Vietnamese Catering San Jose | Pho Bar, Banh Mi & More",
  description:
    "Book Vietnamese catering for your next event in San Jose. Pho bars, banh mi spreads, and full Vietnamese feasts. Perfect for corporate events, weddings, and parties.",
  openGraph: {
    title: "Vietnamese Catering | Vietnoms",
    description:
      "Book Vietnamese catering for your next event. Pho bars, banh mi spreads, and more.",
  },
};

const PACKAGES = [
  {
    name: "Banh Mi Spread",
    price: "From $15/person",
    minGuests: 20,
    description:
      "A variety of our signature banh mi sandwiches with all the fixings.",
    includes: [
      "Choice of 3 banh mi varieties",
      "Pickled vegetables & fresh herbs",
      "Vietnamese-style coleslaw",
      "Chips & drinks",
    ],
  },
  {
    name: "Pho Bar",
    price: "From $22/person",
    minGuests: 25,
    description:
      "An interactive pho station where guests build their own bowls.",
    includes: [
      "24-hour simmered bone broth",
      "Rice noodles",
      "Choice of proteins (beef, chicken, tofu)",
      "Full herb & condiment bar",
      "Spring rolls appetizer",
    ],
  },
  {
    name: "Full Vietnamese Feast",
    price: "From $35/person",
    minGuests: 30,
    description:
      "A complete Vietnamese dining experience with multiple courses.",
    includes: [
      "Fresh spring rolls",
      "Pho bar station",
      "Banh mi selection",
      "Rice plates with grilled meats",
      "Vietnamese coffee & dessert",
      "Full service staff",
    ],
  },
];

export default function CateringPage() {
  return (
    <>
      <ServiceSchema />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Catering", url: `${RESTAURANT.url}/catering` },
        ]}
      />

      {/* Hero */}
      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Catering
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            Bring the bold flavors of Vietnam to your next event. From corporate
            lunches to weddings, we&apos;ve got you covered.
          </p>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-brand-black text-center">
            Our Packages
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full" />

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => (
              <Card
                key={pkg.name}
                className="flex flex-col hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="font-display text-xl">
                    {pkg.name}
                  </CardTitle>
                  <p className="text-brand-red font-semibold text-lg">
                    {pkg.price}
                  </p>
                  <p className="text-sm text-gray-500">
                    Minimum {pkg.minGuests} guests
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-gray-600 text-sm">{pkg.description}</p>
                  <ul className="mt-4 space-y-1.5">
                    {pkg.includes.map((item) => (
                      <li
                        key={item}
                        className="text-sm text-gray-600 flex items-start gap-2"
                      >
                        <span className="text-brand-red mt-1">&#10003;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-brand-black text-center">
            Request a Quote
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Tell us about your event and we&apos;ll put together a custom
            proposal.
          </p>
          <div className="mt-8">
            <CateringForm />
          </div>
        </div>
      </section>
    </>
  );
}
