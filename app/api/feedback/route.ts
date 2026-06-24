import { NextRequest, NextResponse } from "next/server";
import {
  getRequestByToken,
  markResponded,
  insertPrivateFeedback,
} from "@/lib/db/review-requests";
import { sendPrivateFeedbackAlert } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Two-step feedback flow:
 *  1. { token, rating }                       — records the rating, routes 4-5 public / 1-3 private
 *  2. { token, rating, feedbackText, ... }    — stores private feedback for low ratings
 */
export async function POST(request: NextRequest) {
  try {
    const { allowed } = await checkRateLimit(
      `feedback:${getClientIp(request)}`,
      { limit: 10, windowSec: 3600 }
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const rating = Number(body.rating);

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const reviewRequest = await getRequestByToken(token);
    if (!reviewRequest || reviewRequest.status === "cancelled") {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    const routedTo = rating >= 4 ? "public" : "private";

    const feedbackText =
      typeof body.feedbackText === "string" ? body.feedbackText.trim() : "";

    if (feedbackText) {
      // Step 2: private feedback submission
      await insertPrivateFeedback({
        reviewRequestId: reviewRequest.id,
        rating,
        feedbackText: feedbackText.slice(0, 4000),
        customerName:
          (typeof body.name === "string" && body.name.trim()) ||
          reviewRequest.customerName ||
          undefined,
        customerEmail:
          (typeof body.email === "string" && body.email.trim()) ||
          reviewRequest.customerEmail ||
          undefined,
        customerPhone: reviewRequest.customerPhone ?? undefined,
      });

      sendPrivateFeedbackAlert({
        rating,
        feedbackText,
        customerName: body.name || reviewRequest.customerName,
        customerEmail: body.email || reviewRequest.customerEmail,
        customerPhone: reviewRequest.customerPhone,
      }).catch((err) =>
        console.error("Private feedback alert failed:", err)
      );
    }

    // Record the rating (idempotent — re-submits just update it)
    await markResponded(reviewRequest.id, rating, routedTo);

    return NextResponse.json({ success: true, routedTo });
  } catch (error) {
    console.error("Feedback submission failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
