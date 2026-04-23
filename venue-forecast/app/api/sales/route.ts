import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { upsertDailySales, listDailySales } from "@/lib/db/convention-events";
import { parseSalesCsv } from "@/lib/forecast";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;

  const sales = await listDailySales({
    tenantId: session.tenantId,
    fromDate,
    toDate,
  });
  return NextResponse.json({ sales });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const csvText = await file.text();
    let sales;
    try {
      sales = parseSalesCsv(csvText);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid CSV format" },
        { status: 400 }
      );
    }

    if (sales.length === 0) {
      return NextResponse.json(
        { error: "No valid sales data found in CSV" },
        { status: 400 }
      );
    }

    let imported = 0;
    for (const sale of sales) {
      await upsertDailySales({ ...sale, tenantId: session.tenantId });
      imported++;
    }

    return NextResponse.json({ imported, total: sales.length });
  }

  return NextResponse.json({ error: "CSV upload expected" }, { status: 400 });
}
