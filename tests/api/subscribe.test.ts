import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// vi.mock factories are hoisted — cannot reference outer variables
vi.mock("@/lib/db/subscribers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/subscribers")>(
    "@/lib/db/subscribers"
  );
  return {
    ...actual,
    subscribe: vi.fn(),
    setResendContactId: vi.fn(),
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn(),
}));

vi.mock("@/lib/marketing/settings", () => ({
  getMarketingSettings: vi.fn(async () => ({ popupOffer: "[FILL IN: offer]" })),
}));

import { POST } from "@/app/api/subscribe/route";
import { subscribe } from "@/lib/db/subscribers";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

const mockSubscribe = vi.mocked(subscribe);
const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockSendWelcomeEmail = vi.mocked(sendWelcomeEmail);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SUBSCRIBER = {
  id: 1,
  email: "test@example.com",
  name: null,
  phone: null,
  source: "footer",
  status: "subscribed" as const,
  unsubscribeToken: "tok123",
  consentAt: "2026-06-11",
  unsubscribedAt: null,
  createdAt: "2026-06-11",
};

beforeEach(() => {
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockSubscribe.mockResolvedValue(SUBSCRIBER);
  mockSendWelcomeEmail.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  mockSubscribe.mockReset();
  mockCheckRateLimit.mockReset();
  mockSendWelcomeEmail.mockReset();
  delete process.env.RESEND_AUDIENCE_ID;
});

describe("POST /api/subscribe", () => {
  it("returns 400 for a missing email", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid email", async () => {
    const res = await POST(makeRequest({ email: "nope" }));
    expect(res.status).toBe(400);
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false });
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(429);
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes with a valid email and defaults unknown sources to footer", async () => {
    const res = await POST(
      makeRequest({ email: "Test@Example.com", source: "hacker" })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ email: "Test@Example.com", source: "footer" })
    );
  });

  it("passes through valid sources", async () => {
    await POST(makeRequest({ email: "test@example.com", source: "popup" }));
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ source: "popup" })
    );
  });

  it("succeeds even when the welcome email fails", async () => {
    mockSendWelcomeEmail.mockRejectedValue(new Error("RESEND_API_KEY is not set"));
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(200);
  });

  it("returns 500 when the database write fails", async () => {
    mockSubscribe.mockRejectedValue(new Error("db down"));
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(500);
  });
});
