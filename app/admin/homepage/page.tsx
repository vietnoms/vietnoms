import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { HomepageEditor } from "@/components/admin/homepage-editor";

export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  const admin = await isAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Edit Homepage
        </h1>
        <p className="mt-2 text-gray-400">
          Edit text, images, and sections on the homepage.
        </p>
        <div className="mt-6">
          <HomepageEditor />
        </div>
      </div>
    </section>
  );
}
