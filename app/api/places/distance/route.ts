import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const RESTAURANT_ORIGIN = "387 S 1st St, San Jose, CA 95113";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) {
    return NextResponse.json(
      { error: "placeId is required" },
      { status: 400 }
    );
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/distancematrix/json"
  );
  url.searchParams.set("origins", RESTAURANT_ORIGIN);
  url.searchParams.set("destinations", `place_id:${placeId}`);
  url.searchParams.set("units", "imperial");
  url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());
  const data = await res.json();

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    return NextResponse.json(
      { error: "Could not calculate distance" },
      { status: 422 }
    );
  }

  const meters = element.distance.value;
  const miles = Math.round((meters / 1609.34) * 10) / 10;

  return NextResponse.json({
    distanceMiles: miles,
    distanceText: element.distance.text,
  });
}
