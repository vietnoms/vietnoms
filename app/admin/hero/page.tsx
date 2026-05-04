import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { HeroManager } from "@/components/admin/hero-manager";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
            Homepage Hero
          </h1>
          <p className="mt-2 text-gray-400">
            Manage the homepage hero videos and images. Drag to reorder.
          </p>
          <div className="mt-6">
            <HeroManager />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
            Catering Hero
          </h2>
          <p className="mt-2 text-gray-400">
            Manage the catering page hero videos and images. Drag to reorder.
          </p>
          <div className="mt-6">
            <HeroManager category="catering-hero" />
          </div>
        </div>
      </div>
    </section>
  );
}
