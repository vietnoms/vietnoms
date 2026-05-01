import type { Metadata } from "next";
import { OurStoryTimeline } from "@/components/our-story/timeline";
import "@/components/our-story/our-story.css";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "From a boat leaving Vietnam in 1978 to opening Vietnoms in San José — the journey of the Ngo family.",
  // Hidden from nav and search while in development. Remove this `robots`
  // block when the page is ready to go public.
  robots: { index: false, follow: false },
};

export default function OurStoryPage() {
  return <OurStoryTimeline />;
}
