import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  normalizeEmail,
  buildSubscriberCsv,
} from "@/lib/db/subscribers";

describe("isValidEmail", () => {
  it("accepts normal addresses", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.domain.co")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("missing@tld")).toBe(false);
    expect(isValidEmail("two words@example.com")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("rejects absurdly long addresses", () => {
    expect(isValidEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });
});

describe("buildSubscriberCsv", () => {
  const base = {
    phone: null,
    source: "footer",
    status: "subscribed" as const,
    consentAt: "2026-06-11 12:00:00",
  };

  it("produces a header and one row per subscriber", () => {
    const csv = buildSubscriberCsv([
      { ...base, email: "a@example.com", name: "Alice" },
      { ...base, email: "b@example.com", name: null },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("email,name,phone,source,status,consent_at");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("a@example.com");
    expect(lines[2]).toContain("b@example.com,,");
  });

  it("quotes fields containing commas and escapes quotes", () => {
    const csv = buildSubscriberCsv([
      { ...base, email: "a@example.com", name: 'Nguyen, "Ti"' },
    ]);
    expect(csv).toContain('"Nguyen, ""Ti"""');
  });

  it("quotes fields containing newlines", () => {
    const csv = buildSubscriberCsv([
      { ...base, email: "a@example.com", name: "line1\nline2" },
    ]);
    expect(csv).toContain('"line1\nline2"');
  });
});
