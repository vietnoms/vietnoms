import { NextRequest, NextResponse } from "next/server";
import { sendOTP, normalizePhone } from "@/lib/twilio";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    console.log("[send-otp] env check —",
      "hasAccountSid:", !!process.env.TWILIO_ACCOUNT_SID,
      "hasAuthToken:", !!process.env.TWILIO_AUTH_TOKEN,
      "verifySidPrefix:", process.env.TWILIO_VERIFY_SERVICE_SID?.substring(0, 5) || "MISSING"
    );

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    // Basic validation: must be a valid E.164 number
    if (!/^\+\d{10,15}$/.test(normalized)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // Throttle per phone and per IP — each OTP costs Twilio money
    const [phoneLimit, ipLimit] = await Promise.all([
      checkRateLimit(`otp:${normalized}`, { limit: 3, windowSec: 600 }),
      checkRateLimit(`otp-ip:${getClientIp(request)}`, {
        limit: 10,
        windowSec: 3600,
      }),
    ]);
    if (!phoneLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait and try again." },
        { status: 429 }
      );
    }

    const result = await sendOTP(normalized);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Unable to send verification code." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
