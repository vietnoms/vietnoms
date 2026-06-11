import { describe, it, expect } from "vitest";
import { generateToken } from "@/lib/marketing/tokens";

describe("generateToken", () => {
  it("generates URL-safe tokens", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("generates tokens of sufficient length", () => {
    // 24 bytes base64url → 32 chars
    expect(generateToken().length).toBeGreaterThanOrEqual(32);
  });

  it("respects the byte-length argument", () => {
    expect(generateToken(12).length).toBe(16);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateToken()));
    expect(tokens.size).toBe(1000);
  });
});
