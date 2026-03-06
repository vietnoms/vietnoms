import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { ContentGenerator } from "@/components/admin/content-generator";

export const metadata: Metadata = {
  title: "Content Generator | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Content Generator
        </h1>
        <p className="mt-2 text-gray-400">
          Generate SEO-optimized content for blog posts, GMB, meta tags, and
          more. Powered by Claude.
        </p>
        <div className="mt-8">
          <ContentGenerator />
        </div>
      </div>
    </section>
  );
}
