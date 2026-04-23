export const config = {
  brand: {
    name: process.env.NEXT_PUBLIC_BRAND_NAME || "VenueForecast",
    tagline:
      process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
      "Event impact forecasting for local businesses",
    logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || null,
  },
  colors: {
    primary: process.env.NEXT_PUBLIC_COLOR_PRIMARY || "#3b82f6",
    primaryHover: process.env.NEXT_PUBLIC_COLOR_PRIMARY_HOVER || "#2563eb",
  },
} as const;
