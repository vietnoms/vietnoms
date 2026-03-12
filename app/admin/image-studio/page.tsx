import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Image Studio | Vietnoms Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminImageStudioPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <iframe
      src="https://vietnoms-image-studio.vercel.app"
      className="w-full border-0"
      style={{ height: "calc(100vh - 56px)" }}
      allow="clipboard-write"
    />
  );
}
