import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  createVenue,
  listVenues,
  deleteVenue,
} from "@/lib/db/convention-events";
import { slugify } from "@/lib/utils";

export async function GET() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const venues = await listVenues(session.tenantId);
  return NextResponse.json({ venues });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, address, priority } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await createVenue({
    tenantId: session.tenantId,
    name,
    slug: slugify(name),
    address,
    priority: priority ? parseInt(priority, 10) : 0,
  });

  return NextResponse.json({ id: result.id });
}

export async function DELETE(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteVenue(session.tenantId, parseInt(id, 10));
  return NextResponse.json({ ok: true });
}
