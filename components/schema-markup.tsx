import { RESTAURANT } from "@/lib/constants";

interface SchemaProps {
  schema: Record<string, unknown>;
}

function JsonLd({ schema }: SchemaProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function RestaurantSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: RESTAURANT.name,
    image: `${RESTAURANT.url}/images/og-image.jpg`,
    url: RESTAURANT.url,
    telephone: RESTAURANT.phone,
    priceRange: RESTAURANT.priceRange,
    servesCuisine: RESTAURANT.cuisine,
    address: {
      "@type": "PostalAddress",
      streetAddress: RESTAURANT.address.street,
      addressLocality: RESTAURANT.address.city,
      addressRegion: RESTAURANT.address.state,
      postalCode: RESTAURANT.address.zip,
      addressCountry: RESTAURANT.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: RESTAURANT.geo.lat,
      longitude: RESTAURANT.geo.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
        ],
        opens: "11:00",
        closes: "21:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Friday", "Saturday"],
        opens: "11:00",
        closes: "22:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday"],
        opens: "11:00",
        closes: "21:00",
      },
    ],
    menu: `${RESTAURANT.url}/menu`,
    hasMenu: {
      "@type": "Menu",
      url: `${RESTAURANT.url}/menu`,
    },
  };

  return <JsonLd schema={schema} />;
}

export function MenuPageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${RESTAURANT.name} Menu`,
    url: `${RESTAURANT.url}/menu`,
    mainEntity: {
      "@type": "Restaurant",
      name: RESTAURANT.name,
    },
  };

  return <JsonLd schema={schema} />;
}

export function MenuItemSchema({
  name,
  description,
  image,
  price,
  slug,
}: {
  name: string;
  description: string;
  image: string | null;
  price: string;
  slug: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name,
    description,
    image: image || `${RESTAURANT.url}/images/og-image.jpg`,
    url: `${RESTAURANT.url}/menu/${slug}`,
    offers: {
      "@type": "Offer",
      price: price.replace("$", ""),
      priceCurrency: "USD",
    },
  };

  return <JsonLd schema={schema} />;
}

export function ArticleSchema({
  title,
  description,
  image,
  datePublished,
  slug,
}: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  slug: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: image.startsWith("http") ? image : `${RESTAURANT.url}${image}`,
    datePublished,
    author: {
      "@type": "Organization",
      name: RESTAURANT.name,
    },
    publisher: {
      "@type": "Organization",
      name: RESTAURANT.name,
      logo: {
        "@type": "ImageObject",
        url: `${RESTAURANT.url}/images/logo.png`,
      },
    },
    mainEntityOfPage: `${RESTAURANT.url}/blog/${slug}`,
  };

  return <JsonLd schema={schema} />;
}

export function ServiceSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Vietnoms Catering",
    description:
      "Vietnamese catering for events in San Jose. Bun bowl bars, party platters, banh mi, and more.",
    provider: {
      "@type": "Restaurant",
      name: RESTAURANT.name,
      url: RESTAURANT.url,
    },
    areaServed: {
      "@type": "City",
      name: "San Jose",
    },
    url: `${RESTAURANT.url}/catering`,
  };

  return <JsonLd schema={schema} />;
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd schema={schema} />;
}

export function FAQSchema({
  questions,
}: {
  questions: { question: string; answer: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };

  return <JsonLd schema={schema} />;
}
