import { HeroSection } from "@/components/home/hero-section";
import { AboutSnippet } from "@/components/home/about-snippet";
import { FeaturedDishes, FEATURED_NAMES } from "@/components/home/featured-dishes";
import { OrderingCallout } from "@/components/home/ordering-callout";
import { CateringBanner } from "@/components/home/catering-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { LocationSection } from "@/components/home/location-section";
import { reader } from "@/lib/keystatic";
import { getMenuItems } from "@/lib/menu-data";
import { getGoogleReviews } from "@/lib/google-reviews";

export default async function HomePage() {
  const [homePage, allItems, reviews] = await Promise.all([
    reader.singletons.homePage.read().catch(() => null),
    getMenuItems(),
    getGoogleReviews(),
  ]);

  // Match featured items by name (case-insensitive includes)
  const featuredItems = FEATURED_NAMES.map((name) =>
    allItems.find((item) =>
      item.name.toLowerCase().includes(name.toLowerCase())
    )
  ).filter((item): item is NonNullable<typeof item> => item != null);

  return (
    <>
      <div className="bg-yellow-500 text-black text-center px-4 py-3 text-sm font-semibold sm:text-base">
        Our website is currently undergoing construction. Online ordering is temporarily disabled. Please call us at (408) 827-5812 if you would like to place an order.
      </div>
      <HeroSection
        subtitle={homePage?.heroSubtitle}
      />
      <AboutSnippet
        heading={homePage?.aboutHeading}
        text1={homePage?.aboutText1}
        text2={homePage?.aboutText2}
      />
      <FeaturedDishes items={featuredItems} />
      <OrderingCallout />
      <CateringBanner />
      <ReviewsSection reviews={reviews} />
      <LocationSection />
    </>
  );
}
