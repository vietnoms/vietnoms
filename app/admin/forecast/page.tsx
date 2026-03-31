import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { ForecastDashboard } from "@/components/admin/forecast-dashboard";

export const metadata: Metadata = {
  title: "Convention Forecast | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminForecastPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Convention Event Forecast
        </h1>
        <p className="mt-2 text-gray-400">
          Track upcoming convention center events and forecast busy periods for
          staffing and inventory planning.
        </p>
        <div className="mt-8">
          <ForecastDashboard />
        </div>
      </div>
    </section>
  );
}
