export const RESTAURANT = {
  name: "Vietnoms",
  tagline: "Authentic Vietnamese Cuisine",
  description:
    "Bun bowls, banh mi, wings, Vietnamese coffee & more. Order online for pickup or delivery.",
  phone: "(408) 827-5812",
  email: "hello@vietnoms.com",
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
  hours: [
    { days: "Monday - Thursday", open: "11:00 AM", close: "9:00 PM" },
    { days: "Friday - Saturday", open: "11:00 AM", close: "10:00 PM" },
    { days: "Sunday", open: "11:00 AM", close: "9:00 PM" },
  ],
  social: {
    instagram: "https://instagram.com/vietnoms",
    facebook: "https://facebook.com/vietnoms",
    yelp: "https://yelp.com/biz/vietnoms-san-jose",
    tiktok: "https://tiktok.com/@vietnoms",
  },
} as const;

export const SEO_DEFAULTS = {
  title: "Vietnoms | Vietnamese Restaurant in San Jose | Bun Bowls, Banh Mi & More",
  description:
    "Authentic Vietnamese cuisine in San Jose. Bun bowls, banh mi, wings, Vietnamese coffee & more. Order online for pickup or delivery.",
  ogImage: "/images/og-image.jpg",
  twitterHandle: "@vietnoms",
} as const;
