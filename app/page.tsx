import { HeroSection } from "@/components/home/hero-section";
import { AboutSnippet } from "@/components/home/about-snippet";
import { FeaturedDishes } from "@/components/home/featured-dishes";
import { OrderingCallout } from "@/components/home/ordering-callout";
import { CateringBanner } from "@/components/home/catering-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { LocationSection } from "@/components/home/location-section";
import { getAllContent } from "@/lib/db/site-content";
import { getMenuItems } from "@/lib/menu-data";
import { getGoogleReviews } from "@/lib/google-reviews";
import { unstable_cache } from "next/cache";

const getCachedContent = unstable_cache(getAllContent, ["site-content"], {
  tags: ["site-content"],
  revalidate: 300,
});

export default async function HomePage() {
  const [content, allItems, reviews] = await Promise.all([
    getCachedContent().catch(() => ({} as Record<string, string>)),
    getMenuItems(),
    getGoogleReviews(),
  ]);

  // Match featured items by name
  const featuredNames = content.featured_names
    ? content.featured_names.split(",").map((s) => s.trim())
    : ["Bun Bowl", "Nuoc Mam Wings", "The Big Classic", "Banh Mi"];

  const featuredItems = featuredNames
    .map((name) => allItems.find((item) => item.name.toLowerCase().includes(name.toLowerCase())))
    .filter((item): item is NonNullable<typeof item> => item != null);

  return (
    <>
      <HeroSection
        title={content.hero_title}
        subtitle={content.hero_subtitle}
      />
      <AboutSnippet
        heading={content.about_heading}
        text1={content.about_text1}
        text2={content.about_text2}
        imageUrl={content.about_image}
      />
      <FeaturedDishes
        items={featuredItems}
        heading={content.featured_heading}
        subtext={content.featured_subtext}
      />
      <OrderingCallout
        heading={content.ordering_heading}
        text={content.ordering_text}
        buttonText={content.ordering_button}
      />
      <CateringBanner
        heading={content.catering_heading}
        text={content.catering_text}
        imageUrl={content.catering_image}
      />
      <ReviewsSection reviews={reviews} />
      <LocationSection />
    </>
  );
}
