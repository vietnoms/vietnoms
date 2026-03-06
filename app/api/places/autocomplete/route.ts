import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input")?.trim();
  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", input);
  url.searchParams.set("components", "country:us");
  url.searchParams.set("types", "address");
  url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json(
      { error: data.error_message || "Places API error" },
      { status: 502 }
    );
  }

  const predictions = (data.predictions || []).map(
    (p: { place_id: string; description: string }) => ({
      placeId: p.place_id,
      description: p.description,
    })
  );

  return NextResponse.json({ predictions });
}
