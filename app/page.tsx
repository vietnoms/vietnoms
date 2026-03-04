import { HeroSection } from "@/components/home/hero-section";
import { AboutSnippet } from "@/components/home/about-snippet";
import { FeaturedDishes } from "@/components/home/featured-dishes";
import { OrderingCallout } from "@/components/home/ordering-callout";
import { CateringBanner } from "@/components/home/catering-banner";
import { ReviewsSection } from "@/components/home/reviews-section";
import { LocationSection } from "@/components/home/location-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSnippet />
      <FeaturedDishes />
      <OrderingCallout />
      <CateringBanner />
      <ReviewsSection />
      <LocationSection />
    </>
  );
}
