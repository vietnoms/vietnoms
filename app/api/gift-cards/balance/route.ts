import { NextResponse } from "next/server";
import { getSquare } from "@/lib/square";

// Simple in-memory rate limiting: max 5 requests per IP per minute
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRate(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { gan } = body as { gan?: string };

    if (!gan || !/^\d{16}$/.test(gan.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Please enter a valid 16-digit gift card number." },
        { status: 400 }
      );
    }

    const cleanGan = gan.replace(/\s/g, "");
    const square = getSquare();

    const response = await square.giftCards.getFromGan({ gan: cleanGan });
    const card = response?.giftCard;

    if (!card) {
      return NextResponse.json(
        { error: "Gift card not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      balance: Number(card.balanceMoney?.amount ?? 0),
      state: card.state,
    });
  } catch (error) {
    console.error("Gift card balance check error:", error);
    return NextResponse.json(
      { error: "Could not retrieve gift card balance. Please check the number and try again." },
      { status: 400 }
    );
  }
}
