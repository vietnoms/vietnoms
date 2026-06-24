import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getMenuItems } from "@/lib/menu-data";
import { listMedia } from "@/lib/db/media";
import { SocialCalendar } from "@/components/admin/social-calendar";

export const metadata: Metadata = {
  title: "Content Calendar | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  const [menuItems, media] = await Promise.all([
    getMenuItems().catch(() => []),
    listMedia({ limit: 100 }).catch(() => []),
  ]);

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Content Calendar
        </h1>
        <p className="mt-2 text-gray-400">
          Compose, schedule, and publish social posts. Posts auto-publish to
          Facebook/Instagram when the Meta API is configured; otherwise they
          queue up here for one-click copy &amp; paste.
        </p>
        <div className="mt-8">
          <SocialCalendar
            menuItems={menuItems.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              formattedPrice: item.formattedPrice,
              imageUrl: item.imageUrl,
            }))}
            media={media.map((item) => ({
              id: item.id,
              url: item.posterUrl || item.blobUrl,
              filename: item.filename,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
