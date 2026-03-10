"use client";

import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";

type SchemaType = "restaurant" | "localbusiness" | "faq";

const SCHEMA_TYPES: { value: SchemaType; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "localbusiness", label: "LocalBusiness" },
  { value: "faq", label: "FAQ" },
];

export function SchemaBuilder() {
  const [schemaType, setSchemaType] = useState<SchemaType>("restaurant");
  const [bizName, setBizName] = useState("Vietnoms");
  const [address, setAddress] = useState("387 S 1st St");
  const [city, setCity] = useState("San Jose");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("95113");
  const [phone, setPhone] = useState("(408) 827-5812");
  const [priceRange, setPriceRange] = useState("$$");
  const [hours, setHours] = useState("Mo-Su 11:00-21:00");
  const [faqPairs, setFaqPairs] = useState([{ q: "", a: "" }]);
  const [copied, setCopied] = useState(false);

  function generateSchema(): string {
    if (schemaType === "restaurant") {
      return JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: bizName,
          image: "https://vietnoms.com/images/restaurant-hero.jpg",
          url: "https://vietnoms.com",
          telephone: phone,
          priceRange,
          servesCuisine: "Vietnamese",
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
            addressLocality: city,
            addressRegion: state,
            postalCode: zip,
            addressCountry: "US",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: "REPLACE_WITH_LAT",
            longitude: "REPLACE_WITH_LNG",
          },
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "11:00",
            closes: "21:00",
          },
          menu: "https://vietnoms.com/menu",
          acceptsReservations: "True",
          hasMenu: {
            "@type": "Menu",
            url: "https://vietnoms.com/menu",
          },
        },
        null,
        2
      );
    } else if (schemaType === "faq") {
      const validFaqs = faqPairs.filter((f) => f.q.trim() && f.a.trim());
      return JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: validFaqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.a,
            },
          })),
        },
        null,
        2
      );
    } else {
      return JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: bizName,
          image: "https://vietnoms.com/images/storefront.jpg",
          url: "https://vietnoms.com",
          telephone: phone,
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
            addressLocality: city,
            addressRegion: state,
            postalCode: zip,
            addressCountry: "US",
          },
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: hours.split(" ")[1]?.split("-")[0] || "11:00",
            closes: hours.split(" ")[1]?.split("-")[1] || "21:00",
          },
          sameAs: [
            "https://www.facebook.com/vietnoms",
            "https://www.instagram.com/vietnoms",
            "https://www.yelp.com/biz/vietnoms",
          ],
        },
        null,
        2
      );
    }
  }

  function addFaqPair() {
    setFaqPairs([...faqPairs, { q: "", a: "" }]);
  }

  function removeFaqPair(idx: number) {
    setFaqPairs(faqPairs.filter((_, i) => i !== idx));
  }

  function updateFaq(idx: number, field: "q" | "a", val: string) {
    const updated = [...faqPairs];
    updated[idx] = { ...updated[idx], [field]: val };
    setFaqPairs(updated);
  }

  const schema = generateSchema();
  const fullOutput = `<script type="application/ld+json">\n${schema}\n</script>`;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(fullOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClasses =
    "w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:border-brand-red focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Schema type selector */}
      <div className="flex gap-2 flex-wrap">
        {SCHEMA_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setSchemaType(t.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              schemaType === t.value
                ? "bg-brand-red text-white border-brand-red"
                : "text-gray-400 border-gray-700 hover:text-white hover:border-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Business fields */}
      {(schemaType === "restaurant" || schemaType === "localbusiness") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name">
            <input type="text" value={bizName} onChange={(e) => setBizName(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Phone">
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClasses} />
          </Field>
          <Field label="Street Address">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="City">
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="State">
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" className={inputClasses} />
          </Field>
          <Field label="ZIP">
            <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className={inputClasses} />
          </Field>
          {schemaType === "restaurant" && (
            <Field label="Price Range">
              <input type="text" value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="$$" className={inputClasses} />
            </Field>
          )}
          <Field label="Hours">
            <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mo-Su 11:00-21:00" className={inputClasses} />
          </Field>
        </div>
      )}

      {/* FAQ fields */}
      {schemaType === "faq" && (
        <div className="space-y-3">
          {faqPairs.map((pair, idx) => (
            <div key={idx} className="p-4 bg-surface-alt border border-gray-700 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Q&A #{idx + 1}</span>
                {faqPairs.length > 1 && (
                  <button onClick={() => removeFaqPair(idx)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <input
                value={pair.q}
                onChange={(e) => updateFaq(idx, "q", e.target.value)}
                placeholder={`Question ${idx + 1}`}
                className={inputClasses}
              />
              <textarea
                value={pair.a}
                onChange={(e) => updateFaq(idx, "a", e.target.value)}
                placeholder="Answer..."
                rows={2}
                className={`${inputClasses} resize-y`}
              />
            </div>
          ))}
          <button
            onClick={addFaqPair}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 border border-gray-700 rounded-md hover:text-white hover:border-gray-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add FAQ
          </button>
        </div>
      )}

      {/* Output */}
      <div className="relative">
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-surface-alt border border-gray-700 rounded-md text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy Schema"}
        </button>
        <pre className="bg-surface-alt border border-gray-700 rounded-lg p-5 text-green-400 text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-[400px] overflow-auto">
          {fullOutput}
        </pre>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
