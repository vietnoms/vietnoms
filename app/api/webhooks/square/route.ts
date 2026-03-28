import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "crypto";

const WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "") + "/api/webhooks/square";

function isValidSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature || !WEBHOOK_SIGNATURE_KEY) return false;

  const hmac = crypto.createHmac("sha256", WEBHOOK_SIGNATURE_KEY);
  hmac.update(WEBHOOK_URL + body);
  const expectedSignature = hmac.digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");

  // Verify webhook signature in production
  if (process.env.SQUARE_ENVIRONMENT === "production") {
    if (!isValidSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const event = JSON.parse(body);

    console.log(`Square webhook received: type=${event.type}`);

    // Handle catalog and inventory updates — revalidate menu data
    if (
      event.type === "catalog.version.updated" ||
      event.type === "inventory.count.updated"
    ) {
      revalidateTag("menu");
      console.log("Menu cache revalidated via webhook");
      return NextResponse.json({ ok: true, revalidated: true });
    }

    console.log(`Webhook ignored: ${event.type}`);
    return NextResponse.json({ ok: true, ignored: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
