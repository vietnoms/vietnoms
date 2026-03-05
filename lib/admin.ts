import { cookies } from "next/headers";
import crypto from "crypto";

const ADMIN_COOKIE = "vn_admin";
const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

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

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

export async function setAdminSession() {
  const payload = "admin";
  const sig = sign(payload);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(ADMIN_COOKIE);
    if (!cookie?.value) return false;

    const dotIndex = cookie.value.lastIndexOf(".");
    if (dotIndex === -1) return false;

    const payload = cookie.value.substring(0, dotIndex);
    const signature = cookie.value.substring(dotIndex + 1);

    return payload === "admin" && verify(payload, signature);
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Not authorized");
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
