import { NextRequest, NextResponse } from "next/server";
import { sendOTP, normalizePhone } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    // Basic validation: must be a valid E.164 number
    if (!/^\+\d{10,15}$/.test(normalized)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const result = await sendOTP(normalized);

    if (!result.success) {
      return NextResponse.json(
        { error: "Unable to send verification code. Please check your phone number and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
