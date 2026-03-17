import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the twilio module before importing our code
vi.mock("twilio", () => {
  const mockCreate = vi.fn();
  const mockCheckCreate = vi.fn();

  const mockClient = {
    verify: {
      v2: {
        services: vi.fn(() => ({
          verifications: { create: mockCreate },
          verificationChecks: { create: mockCheckCreate },
        })),
      },
    },
    messages: {
      create: vi.fn(),
    },
  };

  const twilioFn = vi.fn(() => mockClient);
  // Attach mocks for test access
  (twilioFn as any).__mockClient = mockClient;
  (twilioFn as any).__mockCreate = mockCreate;
  (twilioFn as any).__mockCheckCreate = mockCheckCreate;

  return { default: twilioFn };
});

// Set env vars before importing
beforeEach(() => {
  process.env.TWILIO_ACCOUNT_SID = "ACtest1234567890";
  process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
  process.env.TWILIO_VERIFY_SERVICE_SID = "VA1234567890abcdef";
  process.env.TWILIO_PHONE_NUMBER = "+14085551234";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
  delete process.env.TWILIO_PHONE_NUMBER;
});

import { normalizePhone, sendOTP, verifyOTP, sendSms } from "@/lib/twilio";
import twilio from "twilio";

function getMocks() {
  const tw = twilio as any;
  return {
    client: tw.__mockClient,
    verificationsCreate: tw.__mockCreate,
    checkCreate: tw.__mockCheckCreate,
    messagesCreate: tw.__mockClient.messages.create,
  };
}

describe("normalizePhone", () => {
  it("formats 10-digit US number to E.164", () => {
    expect(normalizePhone("4085551234")).toBe("+14085551234");
  });

  it("formats 11-digit US number (with leading 1) to E.164", () => {
    expect(normalizePhone("14085551234")).toBe("+14085551234");
  });

  it("strips non-digit characters", () => {
    expect(normalizePhone("(408) 555-1234")).toBe("+14085551234");
  });

  it("preserves already E.164-formatted numbers", () => {
    expect(normalizePhone("+14085551234")).toBe("+14085551234");
  });

  it("handles international format with + prefix", () => {
    expect(normalizePhone("+442071234567")).toBe("+442071234567");
  });

  it("handles digits without + by prepending +", () => {
    expect(normalizePhone("442071234567")).toBe("+442071234567");
  });
});

describe("sendOTP", () => {
  it("sends verification successfully", async () => {
    const { verificationsCreate } = getMocks();
    verificationsCreate.mockResolvedValueOnce({ status: "pending" });

    const result = await sendOTP("+14085551234");

    expect(result).toEqual({ success: true });
    expect(verificationsCreate).toHaveBeenCalledWith({
      to: "+14085551234",
      channel: "sms",
    });
  });

  it("logs the SID prefix", async () => {
    const { verificationsCreate } = getMocks();
    verificationsCreate.mockResolvedValueOnce({ status: "pending" });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendOTP("+14085551234");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[OTP] service SID prefix:",
      "VA123"
    );
  });

  it("returns error with Twilio error code on failure", async () => {
    const { verificationsCreate } = getMocks();
    const twilioError = new Error("Service not found") as any;
    twilioError.code = 60200;
    twilioError.status = 404;
    twilioError.moreInfo = "https://twilio.com/docs/errors/60200";
    verificationsCreate.mockRejectedValueOnce(twilioError);

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendOTP("+14085551234");

    expect(result.success).toBe(false);
    expect(result.error).toContain("[60200]");
  });

  it("returns UNKNOWN code when Twilio error has no code", async () => {
    const { verificationsCreate } = getMocks();
    verificationsCreate.mockRejectedValueOnce(new Error("Network error"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendOTP("+14085551234");

    expect(result.success).toBe(false);
    expect(result.error).toContain("[UNKNOWN]");
  });

  it("throws when TWILIO_VERIFY_SERVICE_SID is missing", async () => {
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendOTP("+14085551234");

    expect(result.success).toBe(false);
    // The error is caught in sendOTP's catch block
    expect(result.error).toBeDefined();
  });

  it("throws when Twilio credentials are missing", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendOTP("+14085551234");

    expect(result.success).toBe(false);
  });
});

describe("verifyOTP", () => {
  it("returns success when status is approved", async () => {
    const { checkCreate } = getMocks();
    checkCreate.mockResolvedValueOnce({ status: "approved" });

    const result = await verifyOTP("+14085551234", "123456");

    expect(result).toEqual({ success: true });
    expect(checkCreate).toHaveBeenCalledWith({
      to: "+14085551234",
      code: "123456",
    });
  });

  it("returns error when status is not approved", async () => {
    const { checkCreate } = getMocks();
    checkCreate.mockResolvedValueOnce({ status: "pending" });

    const result = await verifyOTP("+14085551234", "000000");

    expect(result).toEqual({
      success: false,
      error: "Invalid verification code",
    });
  });

  it("returns error on Twilio exception", async () => {
    const { checkCreate } = getMocks();
    checkCreate.mockRejectedValueOnce(new Error("Service error"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await verifyOTP("+14085551234", "123456");

    expect(result).toEqual({
      success: false,
      error: "Verification failed. Please try again.",
    });
  });
});

describe("sendSms", () => {
  it("sends SMS successfully", async () => {
    const { messagesCreate } = getMocks();
    messagesCreate.mockResolvedValueOnce({ sid: "SM123" });

    const result = await sendSms("(408) 555-1234", "Hello!");

    expect(result).toEqual({ success: true });
    expect(messagesCreate).toHaveBeenCalledWith({
      to: "+14085551234",
      from: "+14085551234",
      body: "Hello!",
    });
  });

  it("returns error when TWILIO_PHONE_NUMBER is missing", async () => {
    delete process.env.TWILIO_PHONE_NUMBER;

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendSms("(408) 555-1234", "Hello!");

    expect(result.success).toBe(false);
    expect(result.error).toContain("TWILIO_PHONE_NUMBER");
  });

  it("returns error on send failure", async () => {
    const { messagesCreate } = getMocks();
    messagesCreate.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendSms("(408) 555-1234", "Hello!");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
  });
});
