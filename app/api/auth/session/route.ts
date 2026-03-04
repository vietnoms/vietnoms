import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/auth";
import { getCustomer } from "@/lib/db/customers";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const customer = await getCustomer(session.customerId);
    return NextResponse.json({
      user: {
        customerId: session.customerId,
        givenName: customer?.givenName || null,
        familyName: customer?.familyName || null,
        phone: customer?.phone || null,
      },
    });
  } catch {
    return NextResponse.json({
      user: { customerId: session.customerId },
    });
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
