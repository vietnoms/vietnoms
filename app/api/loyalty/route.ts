import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLoyaltyProgram, getLoyaltyAccount } from "@/lib/loyalty";

export async function GET() {
  try {
    const program = await getLoyaltyProgram();

    if (!program) {
      return NextResponse.json({ program: null, account: null });
    }

    const session = await getSession();

    if (!session) {
      return NextResponse.json({ program, account: null });
    }

    const account = await getLoyaltyAccount(session.customerId);

    return NextResponse.json({
      program,
      account: account
        ? {
            balance: account.balance,
            lifetimePoints: account.lifetimePoints,
          }
        : null,
    });
  } catch (error) {
    console.error("Loyalty API error:", error);
    return NextResponse.json({ program: null, account: null });
  }
}
