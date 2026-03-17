import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// vi.mock factories are hoisted — cannot reference outer variables
vi.mock("@/lib/twilio", () => ({
  sendOTP: vi.fn(),
  normalizePhone: vi.fn((p: string) => {
    const digits = p.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
    if (p.startsWith("+")) return p;
    return `+${digits}`;
  }),
}));

// Import after mock
import { POST } from "@/app/api/auth/send-otp/route";
import { sendOTP, normalizePhone } from "@/lib/twilio";

const mockSendOTP = vi.mocked(sendOTP);
const mockNormalizePhone = vi.mocked(normalizePhone);

function makeRequest(body: any): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.TWILIO_ACCOUNT_SID = "ACtest1234567890";
  process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
  process.env.TWILIO_VERIFY_SERVICE_SID = "VA1234567890abcdef";
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  mockSendOTP.mockReset();
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
});

describe("POST /api/auth/send-otp", () => {
  it("returns 400 when phone is missing", async () => {
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Phone number is required");
  });

  it("returns 400 for invalid phone number", async () => {
    mockNormalizePhone.mockReturnValueOnce("+123"); // too short

    const res = await POST(makeRequest({ phone: "123" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid phone number");
  });

  it("sends OTP successfully for valid phone", async () => {
    mockSendOTP.mockResolvedValueOnce({ success: true });

    const res = await POST(makeRequest({ phone: "(408) 568-3453" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendOTP).toHaveBeenCalledWith("+14085683453");
  });

  it("passes through Twilio error when sendOTP fails", async () => {
    mockSendOTP.mockResolvedValueOnce({
      success: false,
      error: "[60200] Unable to send verification code. Please check your phone number and try again.",
    });

    const res = await POST(makeRequest({ phone: "(408) 568-3453" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("[60200]");
  });

  it("returns generic error when sendOTP fails with no error message", async () => {
    mockSendOTP.mockResolvedValueOnce({ success: false });

    const res = await POST(makeRequest({ phone: "(408) 568-3453" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Unable to send verification code.");
  });

  it("logs env var diagnostics", async () => {
    mockSendOTP.mockResolvedValueOnce({ success: true });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await POST(makeRequest({ phone: "(408) 568-3453" }));

    expect(logSpy).toHaveBeenCalledWith(
      "[send-otp] env check —",
      "hasAccountSid:", true,
      "hasAuthToken:", true,
      "verifySidPrefix:", "VA123"
    );
  });

  it("logs MISSING when TWILIO_VERIFY_SERVICE_SID is not set", async () => {
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    mockSendOTP.mockResolvedValueOnce({ success: true });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await POST(makeRequest({ phone: "(408) 568-3453" }));

    expect(logSpy).toHaveBeenCalledWith(
      "[send-otp] env check —",
      "hasAccountSid:", true,
      "hasAuthToken:", true,
      "verifySidPrefix:", "MISSING"
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockSendOTP.mockRejectedValueOnce(new Error("Unexpected"));

    const res = await POST(makeRequest({ phone: "(408) 568-3453" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to send verification code");
  });
});
