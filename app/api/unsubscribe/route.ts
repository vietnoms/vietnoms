import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/db/subscribers";

/**
 * Handles both the unsubscribe page form and RFC 8058 one-click
 * unsubscribe (List-Unsubscribe-Post) from email clients.
 */
export async function POST(request: NextRequest) {
  try {
    let token: string | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      token = typeof body.token === "string" ? body.token : null;
    } else {
      // One-click unsubscribe posts form data; token comes from the URL.
      token = request.nextUrl.searchParams.get("token");
    }

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    await unsubscribeByToken(token);
    // Always report success — don't leak whether a token exists.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
