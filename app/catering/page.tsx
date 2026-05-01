import type { Metadata } from "next";
import { ServiceSchema, BreadcrumbSchema, FAQSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";
import { CateringWizard } from "@/components/catering/catering-wizard";
import { PartnersSection } from "@/components/catering/partners-section";
import { getAllContent } from "@/lib/db/site-content";
import { unstable_cache } from "next/cache";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Vietnamese Catering San Jose | Bun Bowl Bar, Party Platters & More",
  description:
    "Book Vietnamese catering for your next event in San Jose. Bun bowl bars, party platters, and pre-made bowls. $20/person. Perfect for corporate events, weddings, and parties.",
  openGraph: {
    title: "Vietnamese Catering | Vietnoms",
    description:
      "Book Vietnamese catering for your next event. Bun bowl bars, party platters, and more. $20/person.",
  },
};

const FAQ = [
  {
    question: "What is included with each serving?",
    answer:
      "Every serving includes your choice of base (rice, vermicelli noodles, or salad), a protein, fresh toppings (lettuce, pickled daikon & carrots, cucumbers, mint, cilantro, bean sprouts, peanuts), a side (egg rolls or shredded pork depending on base), and sauce. You choose your bases, sides, and sauces during the order process.",
  },
  {
    question: "Do you offer vegan options?",
    answer:
      "Yes! Our stir-fried tofu comes with a vegan egg roll and vegan soy sauce. All our vermicelli noodles, rice, and fresh toppings are naturally vegan.",
  },
  {
    question: "What is the minimum order?",
    answer:
      "We require a minimum of 10 guests for catering. For buffet style, each protein requires a minimum of 10 orders.",
  },
  {
    question: "How far in advance should I order?",
    answer:
      "We require at least 7 days advance notice. For large events (100+ guests), 2-3 weeks is recommended.",
  },
  {
    question: "Do you deliver?",
    answer:
      "Yes! Pickup is free from our location at 387 S 1st St, San Jose. Delivery is available within 20 miles for a flat fee ($10-$20 depending on distance). For locations beyond 20 miles, contact us for a custom quote.",
  },
  {
    question: "What is the difference between Buffet Style and Pre-made Bowls?",
    answer:
      "Buffet Style serves party trays of your chosen bases, proteins, sides, and sauces for guests to serve themselves — best for 40+ guests. Pre-made Bowls are individually assembled with a base, protein, and the matching side and sauce — ideal for under 40 guests.",
  },
];

const getCachedContent = unstable_cache(getAllContent, ["site-content"], {
  tags: ["site-content"],
  revalidate: 300,
});

export default async function CateringPage() {
  const content = await getCachedContent().catch(() => ({} as Record<string, string>));
  const heroImage = content.catering_hero_image || "";
  const buffetImage = content.catering_buffet_image || "";
  const premadeImage = content.catering_premade_image || "";
  return (
    <>
      <ServiceSchema />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: RESTAURANT.url },
          { name: "Catering", url: `${RESTAURANT.url}/catering` },
        ]}
      />
      <FAQSchema
        questions={FAQ.map((f) => ({
          question: f.question,
          answer: f.answer,
        }))}
      />

      {/* Hero */}
      <section className="bg-brand-black text-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
            Catering
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl">
            Bring the bold flavors of Vietnam to your next event. Bun bowl bars,
            party platters, and individually prepared bowls — all at $20 per
            person.
          </p>
          {heroImage && (
            <div className="mt-10 relative aspect-[21/9] rounded-lg overflow-hidden bg-gray-800 max-w-4xl">
              <img src={heroImage} alt="Vietnoms catering" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Two Styles Explainer */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-white text-center">
            Two Ways to Cater
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full" />
          <p className="mt-4 text-center text-gray-400 max-w-xl mx-auto">
            Choose the style that fits your event. Both include your choice of
            base, protein, sides, sauces, and all our fresh toppings.
          </p>

          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="bg-surface-alt/50 rounded-xl overflow-hidden">
              {buffetImage ? (
                <div className="relative aspect-[16/9] bg-gray-800">
                  <img src={buffetImage} alt="Buffet style catering" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
                  Buffet Style Photo
                </div>
              )}
              <div className="p-6">
                <h3 className="font-display text-xl font-bold text-white">
                  Buffet Style
                </h3>
                <p className="text-sm text-brand-yellow mt-1">
                  Best for 40+ guests
                </p>
                <p className="mt-3 text-gray-400 text-sm">
                  Party trays of your chosen bases (rice, vermicelli noodles, or
                  salad), proteins, sides, sauces, and all the toppings. Guests
                  serve themselves.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <span className="text-brand-red">&#10003;</span>
                    Self-serve trays
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-red">&#10003;</span>
                    Choose your bases, sides &amp; sauces
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-red">&#10003;</span>
                    Min 10 orders per protein
                  </li>
                </ul>
              </div>
            </div>
            <div className="bg-surface-alt/50 rounded-xl overflow-hidden">
              {premadeImage ? (
                <div className="relative aspect-[16/9] bg-gray-800">
                  <img src={premadeImage} alt="Pre-made bowls catering" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
                  Pre-made Bowls Photo
                </div>
              )}
              <div className="p-6">
                <h3 className="font-display text-xl font-bold text-white">
                  Pre-made Bowls
                </h3>
                <p className="text-sm text-brand-yellow mt-1">
                  Best for under 40 guests
                </p>
                <p className="mt-3 text-gray-400 text-sm">
                  Individually assembled bowls with your chosen base and protein.
                  Side and sauce are matched to each bowl type. Each bowl is
                  labeled.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <span className="text-brand-red">&#10003;</span>
                    Individual portions
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-red">&#10003;</span>
                    Choose base + protein per bowl
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-red">&#10003;</span>
                    Easy distribution
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wizard */}
      <section className="py-16 md:py-24 bg-surface-alt/50" id="order">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-white text-center">
            Build Your Catering Order
          </h2>
          <p className="mt-2 text-center text-gray-400">
            Pay online or submit an inquiry — we&apos;ll handle the rest.
          </p>
          <div className="mt-8">
            <CateringWizard />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-white text-center">
            Frequently Asked Questions
          </h2>
          <div className="mt-2 mx-auto h-1 w-16 bg-brand-red rounded-full" />

          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Partners */}
      <PartnersSection />
    </>
  );
}
