import type { Metadata } from "next";
import Link from "next/link";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { FAQSchema, BreadcrumbSchema } from "@/components/schema-markup";
import { RESTAURANT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQ | Hours, Ordering, Parking & More",
  description:
    "Answers to common questions about Vietnoms in San Jose — hours, online ordering, parking at SoFa Market, catering, gift cards, dietary options, and rewards.",
};

// [FILL IN: review each answer below and adjust details to match reality —
// especially parking specifics, catering lead time, and large-group policy]
const FAQS = [
  {
    question: "Where is Vietnoms located?",
    answer: `We're inside SoFa Market at ${RESTAURANT.address.full}, in downtown San Jose's SoFa arts district. Look for the food hall — we're one of the stalls inside.`,
  },
  {
    question: "What are your hours?",
    answer: RESTAURANT.hours
      .map((h) => `${h.days}: ${h.open} – ${h.close}`)
      .join(". "),
  },
  {
    question: "Is there parking nearby?",
    answer:
      "Yes — street parking on S 1st St and nearby city garages within a short walk of SoFa Market. Evenings and weekends are easiest. [FILL IN: name the closest garage and typical cost]",
  },
  {
    question: "Can I order online for pickup?",
    answer:
      "Yes! Order directly at vietnoms.com/order — no third-party fees, and your food is ready when you arrive. You can also schedule a pickup time in advance.",
  },
  {
    question: "Do you have vegetarian, vegan, or gluten-free options?",
    answer:
      "Plenty. We have dedicated vegan items (Vegancelli, Vegarice, vegan banh mi, vegan egg rolls), most bowls can be made vegetarian or vegan, and we have gluten-free options. Use the dietary filters on our menu page, and tell us about allergies when you order.",
  },
  {
    question: "Do you cater?",
    answer:
      "Yes — we cater everything from office lunches to weddings. Build a quote in about two minutes at vietnoms.com/catering. For larger events we'll follow up within 24 hours. [FILL IN: minimum guest count and recommended lead time]",
  },
  {
    question: "How does the rewards program work?",
    answer:
      "Join free with just your phone number at vietnoms.com/rewards. You earn points automatically on every order and redeem them for free food at checkout.",
  },
  {
    question: "Do you sell gift cards?",
    answer:
      "Yes — digital gift cards are available at vietnoms.com/gift-cards. You can also start a group gift card and invite friends to chip in together.",
  },
  {
    question: "Can you handle large groups or events at the restaurant?",
    answer:
      "SoFa Market has plenty of shared seating for groups. For private events or large pre-orders, reach out through our catering page or call us. [FILL IN: your policy for large walk-in groups]",
  },
];

export default function FAQPage() {
  return (
    <>
      <FAQSchema
        questions={FAQS.map((faq) => ({
          question: faq.question,
          answer: faq.answer.replace(/\s*\[FILL IN:[^\]]*\]/g, ""),
        }))}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white">
            FAQ
          </h1>
          <p className="mt-4 text-gray-400">
            Quick answers to the questions we hear most. Something else?{" "}
            <Link href="/contact" className="text-brand-yellow hover:underline">
              Get in touch
            </Link>{" "}
            or call us at {RESTAURANT.phone}.
          </p>

          <Accordion type="single" collapsible className="mt-10">
            {FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left font-display text-lg text-white hover:text-brand-yellow">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 leading-relaxed">
                  {faq.answer.replace(/\s*\[FILL IN:[^\]]*\]/g, "")}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
