import type { Metadata } from "next";
import { getRequestByToken } from "@/lib/db/review-requests";
import { FeedbackFlow } from "@/components/feedback/feedback-flow";
import { RESTAURANT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How was your order?",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function buildGoogleReviewUrl(): string {
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${RESTAURANT.name} ${RESTAURANT.address.full}`
  )}`;
}

export default async function FeedbackPage({
  params,
}: {
  params: { token: string };
}) {
  let valid = false;
  let alreadyResponded = false;
  let customerName: string | null = null;

  try {
    const request = await getRequestByToken(params.token);
    if (request && request.status !== "cancelled") {
      valid = true;
      alreadyResponded = request.status === "responded";
      customerName = request.customerName?.split(" ")[0] || null;
    }
  } catch (error) {
    console.error("Feedback page error:", error);
  }

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {valid && !alreadyResponded ? (
          <FeedbackFlow
            token={params.token}
            customerName={customerName}
            googleReviewUrl={buildGoogleReviewUrl()}
            yelpReviewUrl={RESTAURANT.social.yelp}
          />
        ) : (
          <div className="text-center">
            <h1 className="font-display text-4xl font-bold text-white">
              {alreadyResponded ? "Thanks — we got your feedback!" : "Link not found"}
            </h1>
            <p className="mt-4 text-gray-400">
              {alreadyResponded
                ? "You've already told us about this order. We appreciate it!"
                : "This feedback link is invalid or has expired."}{" "}
              We&apos;d still love to hear from you anytime at{" "}
              <a
                href={`mailto:${RESTAURANT.email}`}
                className="text-brand-yellow hover:underline"
              >
                {RESTAURANT.email}
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
