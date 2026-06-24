import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { SpecialsManager } from "@/components/admin/specials-manager";

export const metadata: Metadata = {
  title: "Specials | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSpecialsPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        Specials &amp; Announcements
      </h1>
      <SpecialsManager />
    </div>
  );
}
