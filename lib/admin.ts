import { getSession } from "@/lib/auth";

function getAdminCustomerIds(): string[] {
  const raw = process.env.ADMIN_CUSTOMER_IDS;
  if (!raw) return [];
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return getAdminCustomerIds().includes(session.customerId);
}

export async function requireAdmin(): Promise<{ customerId: string }> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  if (!getAdminCustomerIds().includes(session.customerId)) {
    throw new Error("Not authorized");
  }
  return session;
}
