import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies (hoisted)
vi.mock("@/lib/db/convention-events", () => ({
  upsertConventionEvent: vi.fn(),
  listConventionEvents: vi.fn(),
  deleteConventionEvent: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/forecast", () => ({
  parseEventsCsv: vi.fn(),
}));

import { GET, POST, DELETE } from "@/app/api/admin/forecast/events/route";
import {
  upsertConventionEvent,
  listConventionEvents,
  deleteConventionEvent,
} from "@/lib/db/convention-events";
import { requireAdmin } from "@/lib/admin";
import { parseEventsCsv } from "@/lib/forecast";

const mockUpsert = vi.mocked(upsertConventionEvent);
const mockList = vi.mocked(listConventionEvents);
const mockDelete = vi.mocked(deleteConventionEvent);
const mockRequireAdmin = vi.mocked(requireAdmin);
const mockParseCsv = vi.mocked(parseEventsCsv);

function makeRequest(
  method: string,
  opts?: {
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
    formData?: FormData;
  }
): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/forecast/events");
  if (opts?.searchParams) {
    Object.entries(opts.searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }

  const init: RequestInit = { method };

  if (opts?.formData) {
    init.body = opts.formData;
  } else if (opts?.body !== undefined) {
    init.headers = {
      "Content-Type": "application/json",
      ...opts?.headers,
    };
    init.body = JSON.stringify(opts.body);
  } else {
    init.headers = opts?.headers;
  }

  return new NextRequest(url, init as any);
}

const VALID_EVENT = {
  eventName: "NVIDIA GTC 2026",
  startDate: "2026-03-16",
  endDate: "2026-03-19",
  expectedAttendance: 20000,
  eventType: "convention",
  notes: "Venue: San Jose McEnery Convention Center",
};

const API_KEY = "test-forecast-key";

beforeEach(() => {
  process.env.FORECAST_API_KEY = API_KEY;
  mockUpsert.mockResolvedValue({ id: 1 });
  mockList.mockResolvedValue([]);
  mockDelete.mockResolvedValue(undefined);
  mockRequireAdmin.mockResolvedValue(undefined as any);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  delete process.env.FORECAST_API_KEY;
});

// --- Authorization ---

describe("Authorization", () => {
  it("returns 401 when no auth is provided", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Not admin"));
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong API key", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Not admin"));
    const res = await GET(
      makeRequest("GET", { headers: { "x-api-key": "wrong-key" } })
    );
    expect(res.status).toBe(401);
  });

  it("accepts valid API key auth", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Not admin"));
    const res = await GET(
      makeRequest("GET", { headers: { "x-api-key": API_KEY } })
    );
    expect(res.status).toBe(200);
  });

  it("accepts admin cookie auth when no API key", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
  });
});

// --- POST JSON ---

describe("POST /api/admin/forecast/events - JSON", () => {
  it("creates event with valid payload and API key", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: VALID_EVENT,
        headers: { "x-api-key": API_KEY },
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe(1);
    expect(mockUpsert).toHaveBeenCalledWith({
      eventName: "NVIDIA GTC 2026",
      startDate: "2026-03-16",
      endDate: "2026-03-19",
      expectedAttendance: 20000,
      eventType: "convention",
      notes: "Venue: San Jose McEnery Convention Center",
      source: "manual",
    });
  });

  it("returns 400 when eventName is missing", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: { startDate: "2026-03-16" },
        headers: { "x-api-key": API_KEY },
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("eventName");
  });

  it("returns 400 when startDate is missing", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: { eventName: "Test Event" },
        headers: { "x-api-key": API_KEY },
      })
    );
    expect(res.status).toBe(400);
  });

  it("defaults endDate to startDate when omitted", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: { eventName: "Test", startDate: "2026-04-01" },
        headers: { "x-api-key": API_KEY },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: "2026-04-01",
      })
    );
  });

  it("parses expectedAttendance as integer", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: { ...VALID_EVENT, expectedAttendance: "5000" },
        headers: { "x-api-key": API_KEY },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ expectedAttendance: 5000 })
    );
  });

  it("passes undefined for null expectedAttendance", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: { ...VALID_EVENT, expectedAttendance: null },
        headers: { "x-api-key": API_KEY },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ expectedAttendance: undefined })
    );
  });

  it("passes through source field from Tools push", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: { ...VALID_EVENT, source: "email:msg_abc123" },
        headers: { "x-api-key": API_KEY },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "email:msg_abc123" })
    );
  });

  it("defaults source to manual when not provided", async () => {
    const res = await POST(
      makeRequest("POST", {
        body: VALID_EVENT,
        headers: { "x-api-key": API_KEY },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "manual" })
    );
  });
});

// --- POST CSV ---

describe("POST /api/admin/forecast/events - CSV", () => {
  it("imports valid CSV file", async () => {
    mockParseCsv.mockReturnValue([
      { eventName: "Event A", startDate: "2026-04-01", endDate: "2026-04-02" },
      { eventName: "Event B", startDate: "2026-04-03", endDate: "2026-04-04" },
    ] as any);

    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["event_name,start_date,end_date\nA,2026-04-01,2026-04-02"], {
        type: "text/csv",
      }),
      "events.csv"
    );

    const res = await POST(makeRequest("POST", { formData }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.imported).toBe(2);
    expect(data.total).toBe(2);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it("returns 400 when no file in form", async () => {
    const formData = new FormData();
    const res = await POST(makeRequest("POST", { formData }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No file");
  });

  it("returns 400 when CSV is invalid", async () => {
    mockParseCsv.mockImplementation(() => {
      throw new Error("Missing required column: event_name");
    });

    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["bad,csv,data"], { type: "text/csv" }),
      "bad.csv"
    );

    const res = await POST(makeRequest("POST", { formData }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing required column");
  });
});

// --- GET ---

describe("GET /api/admin/forecast/events", () => {
  it("lists events with date filters", async () => {
    mockList.mockResolvedValue([
      {
        id: 1,
        eventName: "GTC",
        startDate: "2026-03-16",
        endDate: "2026-03-19",
        expectedAttendance: 20000,
        eventType: "convention",
        notes: null,
        source: "email:abc",
        createdAt: "2026-03-01",
        updatedAt: "2026-03-01",
      },
    ]);

    const res = await GET(
      makeRequest("GET", {
        searchParams: { from: "2026-03-01", to: "2026-04-01" },
        headers: { "x-api-key": API_KEY },
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.events).toHaveLength(1);
    expect(data.events[0].eventName).toBe("GTC");
    expect(mockList).toHaveBeenCalledWith({
      fromDate: "2026-03-01",
      toDate: "2026-04-01",
    });
  });

  it("lists all events when no filters", async () => {
    const res = await GET(
      makeRequest("GET", { headers: { "x-api-key": API_KEY } })
    );
    expect(res.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith({
      fromDate: undefined,
      toDate: undefined,
    });
  });
});

// --- DELETE ---

describe("DELETE /api/admin/forecast/events", () => {
  it("deletes event by id", async () => {
    const res = await DELETE(
      makeRequest("DELETE", {
        searchParams: { id: "42" },
        headers: { "x-api-key": API_KEY },
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(42);
  });

  it("returns 400 when id is missing", async () => {
    const res = await DELETE(
      makeRequest("DELETE", { headers: { "x-api-key": API_KEY } })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("id");
  });
});
