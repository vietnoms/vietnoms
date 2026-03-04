import { NextRequest, NextResponse } from "next/server";
import { toggleLike } from "@/lib/db/likes";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const result = await toggleLike(itemId, session.customerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
