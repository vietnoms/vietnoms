import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { SubscribersTable } from "@/components/admin/subscribers-table";
import { PopupSettings } from "@/components/admin/popup-settings";

export const metadata: Metadata = {
  title: "Subscribers | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Email Subscribers
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Everyone who joined your list from the footer, popup, checkout,
          catering, or rewards page. Export as CSV for your email platform.
        </p>
      </div>
      <PopupSettings />
      <SubscribersTable />
    </div>
  );
}
