import { redirect } from "next/navigation";
import { isAuth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuth();
  if (!authed) redirect("/login");

  return <DashboardShell>{children}</DashboardShell>;
}
