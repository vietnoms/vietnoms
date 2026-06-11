import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getGoogleReviewsUnfiltered } from "@/lib/google-reviews";
import { getMenuItems } from "@/lib/menu-data";
import { ReviewsDashboard } from "@/components/admin/reviews-dashboard";

export const metadata: Metadata = {
  title: "Reviews | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [google, menuItems] = await Promise.all([
    getGoogleReviewsUnfiltered().catch(() => ({
      configured: false,
      placeId: null,
      rating: null,
      userRatingCount: null,
      reviews: [],
    })),
    getMenuItems().catch(() => []),
  ]);

  const itemNames: Record<string, string> = {};
  for (const item of menuItems) {
    itemNames[item.id] = item.name;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-white">Reviews</h1>
      <p className="mt-1 text-sm text-gray-400 mb-6">
        Moderate dish reviews, monitor Google reviews, and manage automated
        post-order review requests.
      </p>
      <ReviewsDashboard google={google} itemNames={itemNames} />
    </div>
  );
}
