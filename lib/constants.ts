export const RESTAURANT = {
  name: "Vietnoms",
  tagline: "Authentic Vietnamese Cuisine",
  description:
    "Fresh pho, banh mi, Vietnamese coffee & more. Order online for pickup or delivery.",
  phone: "(408) 555-0123", // TODO: Replace with real phone
  email: "hello@vietnoms.com",
  address: {
    street: "123 Main Street", // TODO: Replace with real address
    city: "San Jose",
    state: "CA",
    zip: "95112",
    country: "US",
    full: "123 Main Street, San Jose, CA 95112",
  },
  geo: {
    lat: 37.3382, // TODO: Replace with real coordinates
    lng: -121.8863,
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
  title: "Vietnoms | Vietnamese Restaurant in San Jose | Pho, Banh Mi & More",
  description:
    "Authentic Vietnamese cuisine in San Jose. Fresh pho, banh mi, Vietnamese coffee & more. Order online for pickup or delivery.",
  ogImage: "/images/og-image.jpg",
  twitterHandle: "@vietnoms",
} as const;
