import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "vf_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

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

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

export async function setSession(tenantId: number) {
  const payload = `tenant:${tenantId}`;
  const sig = sign(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<{ tenantId: number } | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    if (!cookie?.value) return null;

    const dotIndex = cookie.value.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payload = cookie.value.substring(0, dotIndex);
    const signature = cookie.value.substring(dotIndex + 1);

    if (!payload.startsWith("tenant:") || !verify(payload, signature))
      return null;

    const tenantId = parseInt(payload.substring(7), 10);
    if (isNaN(tenantId)) return null;

    return { tenantId };
  } catch {
    return null;
  }
}

export async function isAuth(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function requireAuth(): Promise<{ tenantId: number }> {
  const session = await getSession();
  if (!session) throw new Error("Not authorized");
  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
