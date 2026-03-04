import { NextResponse } from "next/server";
import { getCustomerLikes } from "@/lib/db/likes";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const likedItemIds = await getCustomerLikes(session.customerId);
    return NextResponse.json({ likedItemIds });
  } catch (error) {
    console.error("Failed to fetch likes:", error);
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}
