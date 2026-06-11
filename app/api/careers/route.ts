import { NextRequest, NextResponse } from "next/server";
import { getTurso } from "@/lib/turso";
import { sendCareersApplicationEmail } from "@/lib/email";
import { isValidEmail } from "@/lib/db/subscribers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { allowed } = await checkRateLimit(
      `careers:${getClientIp(request)}`,
      { limit: 3, windowSec: 3600 }
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !role || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Name, a valid email, and a role are required." },
        { status: 400 }
      );
    }

    const db = getTurso();
    await db.execute({
      sql: `INSERT INTO job_applications (name, email, phone, role, message)
            VALUES (?, ?, ?, ?, ?)`,
      args: [name, email, phone || null, role, message.slice(0, 4000) || null],
    });

    // Email is best-effort — the application is already saved
    sendCareersApplicationEmail({ name, email, phone, role, message }).catch(
      (err) => console.error("Careers email failed:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Careers application failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
