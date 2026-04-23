import Link from "next/link";
import { CalendarDays, Upload, TrendingUp, Bell } from "lucide-react";
import { config } from "@/lib/config";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-gray-800">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-primary">
            {config.brand.name}
          </span>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            {config.brand.tagline}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            Import event schedules, forecast busy periods, and plan staffing
            with confidence. Works with any POS system.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Get Started
          </Link>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Upload className="h-6 w-6 text-primary" />}
              title="CSV & PDF Import"
              description="Upload event schedules from convention centers in CSV or PDF format."
            />
            <FeatureCard
              icon={<CalendarDays className="h-6 w-6 text-primary" />}
              title="Event Calendar"
              description="Interactive calendar with color-coded impact levels for each day."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6 text-primary" />}
              title="Impact Forecast"
              description="Attendance-based scoring predicts how busy each event will make you."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6 text-primary" />}
              title="Busy Week Alerts"
              description="See upcoming high-impact weeks at a glance for proactive planning."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        {config.brand.name}
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-surface-alt p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );
}
