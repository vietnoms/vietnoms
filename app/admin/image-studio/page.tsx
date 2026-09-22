import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { SectionExplainer } from "@/components/admin/section-explainer";

export const metadata: Metadata = {
  title: "Image Studio | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminImageStudioPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <SectionExplainer id="studio" />
      </div>
      <iframe
        src="https://vietnoms-image-studio.vercel.app"
        className="w-full flex-1 border-0"
        allow="clipboard-write"
      />
    </div>
  );
}
