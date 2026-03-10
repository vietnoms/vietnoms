import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { PurchasesTable } from "@/components/admin/purchases-table";

export default async function PurchasesPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        Purchases
      </h1>
      <PurchasesTable />
    </div>
  );
}
