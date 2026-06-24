import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/review-requests", () => ({
  getRequestByToken: vi.fn(),
  markResponded: vi.fn(),
  insertPrivateFeedback: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/email", () => ({
  sendPrivateFeedbackAlert: vi.fn(),
}));

import { POST } from "@/app/api/feedback/route";
import {
  getRequestByToken,
  markResponded,
  insertPrivateFeedback,
} from "@/lib/db/review-requests";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPrivateFeedbackAlert } from "@/lib/email";

const mockGetRequest = vi.mocked(getRequestByToken);
const mockMarkResponded = vi.mocked(markResponded);
const mockInsertFeedback = vi.mocked(insertPrivateFeedback);
const mockRateLimit = vi.mocked(checkRateLimit);
const mockAlert = vi.mocked(sendPrivateFeedbackAlert);

const REQUEST = {
  id: 7,
  purchaseId: 1,
  squareOrderId: "ord_1",
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  customerPhone: null,
  channel: "email" as const,
  token: "tok123",
  status: "sent",
  scheduledAt: "2026-06-11T10:00:00Z",
  sentAt: "2026-06-11T10:01:00Z",
  respondedAt: null,
  rating: null,
  routedTo: null,
  createdAt: "2026-06-11T07:00:00Z",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockRateLimit.mockResolvedValue({ allowed: true });
  mockGetRequest.mockResolvedValue(REQUEST);
  mockMarkResponded.mockResolvedValue(undefined);
  mockInsertFeedback.mockResolvedValue({ id: 1 });
  mockAlert.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("POST /api/feedback", () => {
  it("returns 404 for an unknown token", async () => {
    mockGetRequest.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: "nope", rating: 5 }));
    expect(res.status).toBe(404);
  });

  it("returns 404 for a cancelled request", async () => {
    mockGetRequest.mockResolvedValue({ ...REQUEST, status: "cancelled" });
    const res = await POST(makeRequest({ token: "tok123", rating: 5 }));
    expect(res.status).toBe(404);
  });

  it("rejects out-of-range ratings", async () => {
    for (const rating of [0, 6, 2.5, "abc", null]) {
      const res = await POST(makeRequest({ token: "tok123", rating }));
      expect(res.status).toBe(400);
    }
  });

  it("routes 4-5 stars to public", async () => {
    const res = await POST(makeRequest({ token: "tok123", rating: 5 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.routedTo).toBe("public");
    expect(mockMarkResponded).toHaveBeenCalledWith(7, 5, "public");
    expect(mockInsertFeedback).not.toHaveBeenCalled();
  });

  it("routes 1-3 stars to private", async () => {
    const res = await POST(makeRequest({ token: "tok123", rating: 2 }));
    const data = await res.json();
    expect(data.routedTo).toBe("private");
    expect(mockMarkResponded).toHaveBeenCalledWith(7, 2, "private");
  });

  it("stores private feedback text and alerts the owner", async () => {
    const res = await POST(
      makeRequest({ token: "tok123", rating: 1, feedbackText: "Order was cold" })
    );
    expect(res.status).toBe(200);
    expect(mockInsertFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewRequestId: 7,
        rating: 1,
        feedbackText: "Order was cold",
      })
    );
    expect(mockAlert).toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false });
    const res = await POST(makeRequest({ token: "tok123", rating: 5 }));
    expect(res.status).toBe(429);
  });

  it("allows re-submitting a rating (idempotent update)", async () => {
    mockGetRequest.mockResolvedValue({ ...REQUEST, status: "responded", rating: 4 });
    const res = await POST(makeRequest({ token: "tok123", rating: 4 }));
    expect(res.status).toBe(200);
  });
});
