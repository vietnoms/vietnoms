import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "vn_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getSecret(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return Buffer.from(secret, "hex");
}

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(value);
  return hmac.digest("hex");
}

function verify(value: string, signature: string): boolean {
  const expected = sign(value);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function setSessionCookie(squareCustomerId: string) {
  const sig = sign(squareCustomerId);
  const cookieValue = `${squareCustomerId}.${sig}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<{ customerId: string } | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie?.value) return null;

    const dotIndex = cookie.value.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const customerId = cookie.value.substring(0, dotIndex);
    const signature = cookie.value.substring(dotIndex + 1);

    if (!verify(customerId, signature)) return null;

    return { customerId };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
