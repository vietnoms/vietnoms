import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, normalizePhone } from "@/lib/twilio";
import { findCustomerByPhone, createSquareCustomer } from "@/lib/square-customers";
import { upsertCustomer } from "@/lib/db/customers";
import { setSessionCookie } from "@/lib/auth";
import { getLoyaltyProgram, getLoyaltyAccount, createLoyaltyAccount } from "@/lib/loyalty";

export async function POST(request: NextRequest) {
  let body: { phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { phone, code } = body;

  if (!phone || !code) {
    return NextResponse.json(
      { error: "Phone and code are required" },
      { status: 400 }
    );
  }

  const normalized = normalizePhone(phone);

  // Verify the OTP with Twilio
  const verification = await verifyOTP(normalized, code);
  if (!verification.success) {
    return NextResponse.json(
      { error: verification.error || "Invalid code" },
      { status: 401 }
    );
  }

  // OTP verified — now set up the customer account and session
  try {
    // Find or create Square customer
    const existing = await findCustomerByPhone(normalized);
    const customer = existing ?? await createSquareCustomer({ phone: normalized });

    if (!customer?.id) {
      return NextResponse.json(
        { error: "Failed to create customer record" },
        { status: 500 }
      );
    }

    // Cache customer data in Turso
    await upsertCustomer({
      id: customer.id,
      phone: normalized,
      givenName: customer.givenName || undefined,
      familyName: customer.familyName || undefined,
      email: customer.emailAddress || undefined,
    });

    // Auto-create loyalty account if program exists and customer has no account
    try {
      const program = await getLoyaltyProgram();
      if (program?.id && customer.id) {
        const existingAccount = await getLoyaltyAccount(customer.id);
        if (!existingAccount) {
          await createLoyaltyAccount(program.id, normalized);
        }
      }
    } catch (err) {
      console.error("Auto loyalty enrollment failed:", err);
    }

    // Set session cookie
    await setSessionCookie(customer.id);

    return NextResponse.json({
      success: true,
      user: {
        customerId: customer.id,
        givenName: customer.givenName || null,
        familyName: customer.familyName || null,
        phone: normalized,
      },
    });
  } catch (error) {
    console.error("Post-verification error:", error);
    return NextResponse.json(
      { error: "Phone verified but sign-in failed. Please try again." },
      { status: 500 }
    );
  }
}
