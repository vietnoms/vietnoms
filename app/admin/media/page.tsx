import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { MediaManager } from "@/components/admin/media-manager";
import { EmbeddedPhotosManager } from "@/components/admin/embedded-photos-manager";

export const metadata: Metadata = {
  title: "Media Library | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Media Library
        </h1>
        <p className="mt-2 text-gray-400">
          Upload and manage images for the gallery, marketing, and AI-generated
          assets.
        </p>
        <div className="mt-8">
          <EmbeddedPhotosManager />
        </div>

        <hr className="my-10 border-gray-700" />

        <div className="mt-8">
          <MediaManager />
        </div>
      </div>
    </section>
  );
}
