import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { HeroManager } from "@/components/admin/hero-manager";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Hero Slideshow
        </h1>
        <p className="mt-2 text-gray-400">
          Manage the homepage hero videos and images. Drag to reorder.
        </p>
        <div className="mt-6">
          <HeroManager />
        </div>
      </div>
    </section>
  );
}
