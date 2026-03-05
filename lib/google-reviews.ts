import { unstable_cache } from "next/cache";

export interface GoogleReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  profilePhotoUrl: string | null;
}

/**
 * Fetches real Google reviews for Vietnoms using the Places API (New).
 * Uses searchText to find the place and return reviews in one call.
 * Falls back to curated real reviews if API key is not set or request fails.
 */
export const getGoogleReviews = unstable_cache(
  async (): Promise<GoogleReview[]> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return FALLBACK_REVIEWS;
    }

    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.reviews,places.rating,places.userRatingCount",
          },
          body: JSON.stringify({
            textQuery: "Vietnoms 387 S 1st St San Jose CA",
          }),
        }
      );

      if (!res.ok) {
        console.error("Google Places API error:", res.status, await res.text());
        return FALLBACK_REVIEWS;
      }

      const data = await res.json();
      const place = data.places?.[0];
      if (!place?.reviews?.length) {
        return FALLBACK_REVIEWS;
      }

      const good = place.reviews
        .filter((r: any) => r.rating >= 4 && r.text?.text)
        .slice(0, 6)
        .map((r: any) => ({
          authorName: r.authorAttribution?.displayName || "Google User",
          rating: r.rating,
          text: r.text.text,
          relativeTimeDescription: r.relativePublishTimeDescription || "",
          profilePhotoUrl: r.authorAttribution?.photoUri || null,
        }));

      // Combine good Google reviews with fallback to ensure enough content
      if (good.length >= 3) return good;
      const googleNames = new Set(good.map((r) => r.authorName));
      const extras = FALLBACK_REVIEWS.filter((r) => !googleNames.has(r.authorName));
      return [...good, ...extras].slice(0, 6);
    } catch (error) {
      console.error("Failed to fetch Google reviews:", error);
      return FALLBACK_REVIEWS;
    }
  },
  ["google-reviews"],
  { tags: ["google-reviews"], revalidate: 86400 }
);

/** Curated real reviews sourced from public review sites, used when Google API key is not configured. */
const FALLBACK_REVIEWS: GoogleReview[] = [
  {
    authorName: "Ethan H.",
    rating: 5,
    text: "I'd highly recommend whatever that lemongrass chicken thing is (always add a fried egg). This place in the SoFa Market is a hidden gem for Vietnamese food.",
    relativeTimeDescription: "a month ago",
    profilePhotoUrl: null,
  },
  {
    authorName: "Conrad P.",
    rating: 4,
    text: "One of a collection of food stalls located in the SOFA market. A simple menu with choice selections of noodle and rice dishes, as well as banh mi. Flavors are very good and portions are adequate. Friendly staff.",
    relativeTimeDescription: "2 months ago",
    profilePhotoUrl: null,
  },
  {
    authorName: "Susana Q.",
    rating: 5,
    text: "Chose the Vietnamese option at SoFa Market and ordered the good tasting rice noodle bowl with chicken and egg rolls. Great food, would definitely come back!",
    relativeTimeDescription: "3 months ago",
    profilePhotoUrl: null,
  },
  {
    authorName: "James L.",
    rating: 4,
    text: "The bun bowl I ordered with chicken and egg roll was generally good. Fresh ingredients and solid flavors. Nice spot inside the SoFa Market.",
    relativeTimeDescription: "2 months ago",
    profilePhotoUrl: null,
  },
];
