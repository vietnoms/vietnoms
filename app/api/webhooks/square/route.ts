import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "crypto";

const WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
const WEBHOOK_PATH = "/api/webhooks/square";

/**
 * Square signs each delivery as base64(HMAC-SHA256(notificationUrl + rawBody)),
 * keyed by the subscription's signature key, where notificationUrl is the URL
 * configured in the Square dashboard and must match byte-for-byte. That is easy
 * to get wrong across apex vs. www, a trailing slash, or a stale
 * NEXT_PUBLIC_SITE_URL — so we verify against every plausible URL for this
 * endpoint and accept the delivery if any of them reproduces Square's signature.
 */
function candidateUrls(request: NextRequest): string[] {
  const urls = new Set<string>();
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  if (envBase) urls.add(envBase.replace(/\/+$/, "") + WEBHOOK_PATH);
  const host = request.headers.get("host");
  if (host) urls.add(`https://${host}${WEBHOOK_PATH}`);
  urls.add(`https://www.vietnoms.com${WEBHOOK_PATH}`);
  urls.add(`https://vietnoms.com${WEBHOOK_PATH}`);
  return Array.from(urls);
}

function signatureMatches(url: string, body: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SIGNATURE_KEY)
    .update(url + body)
    .digest("base64");
  const received = Buffer.from(signature);
  const computed = Buffer.from(expected);
  return (
    received.length === computed.length &&
    crypto.timingSafeEqual(received, computed)
  );
}

function isValidSignature(
  request: NextRequest,
  body: string,
  signature: string | null
): boolean {
  if (!signature || !WEBHOOK_SIGNATURE_KEY) return false;
  try {
    return candidateUrls(request).some((url) =>
      signatureMatches(url, body, signature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");

  // Verify webhook signature in production
  if (process.env.SQUARE_ENVIRONMENT === "production") {
    if (!isValidSignature(request, body, signature)) {
      // Diagnostic (no secrets): tells us whether the key is present and which
      // URLs we tried, so a persistent 401 points cleanly at the signature key.
      console.error(
        "Square webhook signature check failed: " +
          JSON.stringify({
            keyConfigured: !!WEBHOOK_SIGNATURE_KEY,
            keyLength: WEBHOOK_SIGNATURE_KEY.length,
            signaturePresent: !!signature,
            host: request.headers.get("host"),
            candidates: candidateUrls(request),
          })
      );
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
