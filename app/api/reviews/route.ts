import { NextRequest, NextResponse } from "next/server";
import { getItemReviews, getItemStats, createReview, hasReviewed } from "@/lib/db/reviews";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const itemId = request.nextUrl.searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  try {
    const [reviews, stats] = await Promise.all([
      getItemReviews(itemId),
      getItemStats(itemId),
    ]);

    return NextResponse.json({ reviews, stats });
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { itemId, rating, reviewText } = body;

    if (!itemId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Valid itemId and rating (1-5) are required" },
        { status: 400 }
      );
    }

    // Check if user already reviewed this item
    const alreadyReviewed = await hasReviewed(itemId, session.customerId);
    if (alreadyReviewed) {
      return NextResponse.json(
        { error: "You have already reviewed this item" },
        { status: 409 }
      );
    }

    const result = await createReview({
      squareItemId: itemId,
      squareCustomerId: session.customerId,
      rating,
      reviewText: reviewText || undefined,
    });

    return NextResponse.json({
      success: true,
      reviewId: result.id,
      message: "Review submitted for moderation",
    });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
