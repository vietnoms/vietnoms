import { revalidateTag } from "next/cache";
import {
  getDueRequests,
  markSent,
  markFailed,
  cancelStaleRequests,
} from "@/lib/db/review-requests";
import { sendReviewRequestEmail } from "@/lib/email";
import { sendSms } from "@/lib/twilio";
import { RESTAURANT } from "@/lib/constants";

export interface TickResult {
  menuRevalidated: boolean;
  reviewRequestsSent: number;
  reviewRequestsFailed: number;
  staleRequestsCancelled: number;
  socialPostsPublished: number;
  socialPostsReady: number;
  socialPostsFailed: number;
  errors: string[];
}

/** Send queued review requests whose scheduled time has passed. */
export async function processDueReviewRequests(): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;

  const emailConfigured = !!process.env.RESEND_API_KEY;
  const smsConfigured =
    !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_PHONE_NUMBER;

  const due = await getDueRequests(new Date().toISOString());

  for (const request of due) {
    const feedbackUrl = `${RESTAURANT.url}/feedback/${request.token}`;

    try {
      if (request.channel === "email") {
        if (!emailConfigured || !request.customerEmail) continue; // stays queued until configured
        await sendReviewRequestEmail({
          email: request.customerEmail,
          name: request.customerName?.split(" ")[0],
          feedbackUrl,
        });
      } else {
        if (!smsConfigured || !request.customerPhone) continue;
        const result = await sendSms(
          request.customerPhone,
          `Thanks for ordering from Vietnoms! How was it? Tell us in 30 seconds: ${feedbackUrl}`
        );
        if (!result.success) {
          throw new Error(result.error || "SMS send failed");
        }
      }
      await markSent(request.id);
      sent++;
    } catch (error) {
      await markFailed(
        request.id,
        error instanceof Error ? error.message : String(error)
      ).catch(() => {});
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Single idempotent tick that drains all scheduled work. Runs from the
 * daily Vercel cron and opportunistically after checkouts, so review
 * requests and social posts go out close to their scheduled times even
 * on plans where crons are infrequent.
 */
export async function runTick(
  options: { revalidateMenu?: boolean } = {}
): Promise<TickResult> {
  const result: TickResult = {
    menuRevalidated: false,
    reviewRequestsSent: 0,
    reviewRequestsFailed: 0,
    staleRequestsCancelled: 0,
    socialPostsPublished: 0,
    socialPostsReady: 0,
    socialPostsFailed: 0,
    errors: [],
  };

  // Menu revalidation only from the daily cron — not on inline (checkout) runs
  if (options.revalidateMenu) {
    try {
      revalidateTag("menu");
      result.menuRevalidated = true;
    } catch (error) {
      result.errors.push(`menu: ${error}`);
    }
  }

  try {
    const requests = await processDueReviewRequests();
    result.reviewRequestsSent = requests.sent;
    result.reviewRequestsFailed = requests.failed;
  } catch (error) {
    result.errors.push(`review-requests: ${error}`);
  }

  try {
    const { publishDueSocialPosts } = await import("@/lib/social/publish");
    const social = await publishDueSocialPosts();
    result.socialPostsPublished = social.published;
    result.socialPostsReady = social.ready;
    result.socialPostsFailed = social.failed;
  } catch (error) {
    result.errors.push(`social-posts: ${error}`);
  }

  try {
    result.staleRequestsCancelled = await cancelStaleRequests(7);
  } catch (error) {
    result.errors.push(`housekeeping: ${error}`);
  }

  return result;
}

