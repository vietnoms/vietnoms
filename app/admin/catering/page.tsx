import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { CateringTable } from "@/components/admin/catering-table";

export const metadata: Metadata = {
  title: "Catering Dashboard | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminCateringPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Catering Dashboard
        </h1>
        <p className="mt-2 text-gray-400">
          Manage catering requests, orders, and inquiries.
        </p>
        <div className="mt-8">
          <CateringTable />
        </div>
      </div>
    </section>
  );
}
