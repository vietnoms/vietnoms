import { NextRequest, NextResponse } from "next/server";
import { findCustomerByPhone } from "@/lib/square-customers";
import { normalizePhone } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone);
    if (!/^\+\d{10,15}$/.test(normalized)) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const customer = await findCustomerByPhone(normalized);

    if (!customer) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      givenName: customer.givenName || null,
      familyName: customer.familyName || null,
      emailAddress: customer.emailAddress || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to look up customer" },
      { status: 500 }
    );
  }
}
