import type { Metadata } from "next";
import { config } from "@/lib/config";
import { ForecastDashboard } from "@/components/forecast-dashboard";

export const metadata: Metadata = {
  title: `Forecast | ${config.appName}`,
};

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Event Forecast
        </h1>
        <p className="mt-2 text-gray-400">
          Track upcoming events and forecast busy periods for staffing and
          inventory planning.
        </p>
        <div className="mt-8">
          <ForecastDashboard />
        </div>
      </div>
    </section>
  );
}
