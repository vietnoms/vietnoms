import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { ContentCalendar } from "@/components/admin/content-calendar";

export const metadata: Metadata = {
  title: "Content Calendar | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Content Calendar
        </h1>
        <p className="mt-2 text-gray-400">
          Weekly publishing rhythm and topic cluster strategy for consistent SEO
          growth.
        </p>
        <div className="mt-8">
          <ContentCalendar />
        </div>
      </div>
    </section>
  );
}
