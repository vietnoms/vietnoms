import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { SeoChecklist } from "@/components/admin/seo-checklist";

export const metadata: Metadata = {
  title: "SEO Audit | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          SEO Audit Checklist
        </h1>
        <p className="mt-2 text-gray-400">
          Track your SEO progress. Check off tasks as you complete them — state
          is saved to the database.
        </p>
        <div className="mt-8">
          <SeoChecklist />
        </div>
      </div>
    </section>
  );
}
