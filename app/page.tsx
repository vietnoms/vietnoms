import { HeroSection } from "@/components/home/hero-section";
import { AboutSnippet } from "@/components/home/about-snippet";
import { FeaturedDishes } from "@/components/home/featured-dishes";
import { OrderingCallout } from "@/components/home/ordering-callout";
import { CateringBanner } from "@/components/home/catering-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { LocationSection } from "@/components/home/location-section";
import { reader } from "@/lib/keystatic";

export default async function HomePage() {
  const homePage = await reader.singletons.homePage.read().catch(() => null);

  return (
    <>
      <HeroSection
        subtitle={homePage?.heroSubtitle}
      />
      <AboutSnippet
        heading={homePage?.aboutHeading}
        text1={homePage?.aboutText1}
        text2={homePage?.aboutText2}
      />
      <FeaturedDishes />
      <OrderingCallout />
      <CateringBanner />
      <ReviewsSection />
      <LocationSection />
    </>
  );
}
