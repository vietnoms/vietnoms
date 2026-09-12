export const RESTAURANT = {
  name: "Vietnoms",
  tagline: "Authentic Vietnamese Cuisine",
  description:
    "Bun bowls, banh mi, wings, Vietnamese coffee & more. Order online for pickup or delivery.",
  phone: "(408) 827-5812",
  email: "catering@vietnoms.com",
  address: {
    street: "387 S 1st St, Ste 121",
    city: "San Jose",
    state: "CA",
    zip: "95113",
    country: "US",
    full: "387 S 1st St, Ste 121, San Jose, CA 95113",
  },
  geo: {
    lat: 37.3303,
    lng: -121.8864,
  },
  priceRange: "$$",
  cuisine: "Vietnamese",
  url: "https://vietnoms.com",
  // Square delivery ordering, hosted on Cash App. This is a real Square order flow
  // (not a tip/payment link): the customer chooses delivery and enters their address
  // there. Site ordering at /order stays pickup-only.
  orderDeliveryUrl: "https://cash.app/$vietnoms/",
  orderDeliveryLabel: "Order delivery on Cash App (Square)",
  hours: [
    { days: "Monday - Thursday", open: "11:30 AM", close: "7:00 PM" },
    { days: "Friday - Saturday", open: "11:30 AM", close: "8:00 PM" },
    { days: "Sunday", open: "11:30 AM", close: "7:00 PM" },
  ],
  social: {
    instagram: "https://www.instagram.com/vietnoms_sj",
    facebook: "https://www.facebook.com/profile.php?id=61577007672732",
    yelp: "https://yelp.com/biz/vietnoms-san-jose",
  },
} as const;

// Third-party delivery marketplaces. Footer-only, muted, never a primary CTA —
// their menu prices are marked up above our own pickup/delivery pricing.
export const THIRD_PARTY_DELIVERY = [
  {
    name: "DoorDash",
    url: "https://www.doordash.com/store/vietnoms-san-jose-215650/",
  },
  {
    name: "Uber Eats",
    url: "https://www.ubereats.com/store/vietnoms/y_93cFlATrGffj4oqsqaLQ",
  },
  {
    name: "Grubhub",
    url: "https://www.grubhub.com/restaurant/vietnoms-387-s-1st-st-ste-121-san-jose/671283",
  },
] as const;

export const SEO_DEFAULTS = {
  title: "Vietnoms | Vietnamese Restaurant in San Jose | Bun Bowls, Banh Mi & More",
  description:
    "Authentic Vietnamese cuisine in San Jose. Bun bowls, banh mi, wings, Vietnamese coffee & more. Order online for pickup or delivery.",
  ogImage: "/images/og-image.jpg",
  twitterHandle: "@vietnoms",
} as const;
