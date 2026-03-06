import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  ensureSeoChecklistTable,
  getSeoChecklist,
  toggleSeoChecklistItem,
  seedSeoChecklist,
} from "@/lib/db/seo-checklist";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSeoChecklistTable();
    await seedSeoChecklist();
    const items = await getSeoChecklist();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("SEO checklist GET error:", error);
    return NextResponse.json(
      { error: "Failed to load checklist" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, done } = await request.json();
    if (typeof id !== "number" || typeof done !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await toggleSeoChecklistItem(id, done);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SEO checklist PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}
