import { NextRequest, NextResponse } from "next/server";
import {
  subscribe,
  isValidEmail,
  setResendContactId,
  type SubscriberSource,
} from "@/lib/db/subscribers";
import { sendWelcomeEmail } from "@/lib/email";
import { getMarketingSettings } from "@/lib/marketing/settings";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { RESTAURANT } from "@/lib/constants";

const VALID_SOURCES: SubscriberSource[] = [
  "footer",
  "popup",
  "checkout",
  "catering",
  "rewards",
];

export async function POST(request: NextRequest) {
  try {
    const { allowed } = await checkRateLimit(
      `subscribe:${getClientIp(request)}`,
      { limit: 5, windowSec: 3600 }
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many signups. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const source: SubscriberSource = VALID_SOURCES.includes(body.source)
      ? body.source
      : "footer";

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const subscriber = await subscribe({ email, name, source });
    const unsubscribeUrl = `${RESTAURANT.url}/unsubscribe/${subscriber.unsubscribeToken}`;
    const oneClickUnsubscribeUrl = `${RESTAURANT.url}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;

    // Best-effort extras — never fail the signup over email/sync issues.
    try {
      const settings = await getMarketingSettings();
      await sendWelcomeEmail({
        email: subscriber.email,
        name: subscriber.name,
        unsubscribeUrl,
        oneClickUnsubscribeUrl,
        offerCopy: settings.popupOffer,
      });
    } catch (error) {
      console.error("Welcome email failed:", error);
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (audienceId && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const contact = await resend.contacts.create({
          email: subscriber.email,
          firstName: subscriber.name ?? undefined,
          audienceId,
        });
        if (contact.data?.id) {
          await setResendContactId(subscriber.id, contact.data.id);
        }
      } catch (error) {
        console.error("Resend audience sync failed:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
