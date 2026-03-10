import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getCateringRequest,
  getCateringItems,
  updateCateringRequestStatus,
  ensureCateringTables,
} from "@/lib/db/catering";

// GET — admin: single request with items
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCateringTables();
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const cateringRequest = await getCateringRequest(id);
  if (!cateringRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await getCateringItems(id);
  return NextResponse.json({ request: cateringRequest, items });
}

// PATCH — admin: update status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCateringTables();
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const { status } = body;
  const valid = ["submitted", "paid", "completed", "cancelled"];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await updateCateringRequestStatus(id, status);
  return NextResponse.json({ success: true });
}
