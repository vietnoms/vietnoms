import { describe, it, expect } from "vitest";
import { evaluateWindow, type WindowState } from "@/lib/rate-limit";

const OPTS = { limit: 3, windowSec: 600 };

describe("evaluateWindow", () => {
  const now = new Date("2026-06-11T12:00:00Z");

  it("starts a new window when no prior state exists", () => {
    const state: WindowState = { windowStart: null, count: 0 };
    const result = evaluateWindow(state, now, OPTS);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);
    expect(result.newWindowStart).toBe(now.toISOString());
  });

  it("allows requests up to the limit within a window", () => {
    const windowStart = "2026-06-11T11:55:00.000Z"; // 5 min ago, inside 10-min window
    expect(
      evaluateWindow({ windowStart, count: 2 }, now, OPTS).allowed
    ).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    const windowStart = "2026-06-11T11:55:00.000Z";
    const result = evaluateWindow({ windowStart, count: 3 }, now, OPTS);
    expect(result.allowed).toBe(false);
    expect(result.newCount).toBe(4);
    expect(result.newWindowStart).toBe(windowStart);
  });

  it("rolls over to a fresh window once the old one expires", () => {
    const windowStart = "2026-06-11T11:45:00.000Z"; // 15 min ago, outside window
    const result = evaluateWindow({ windowStart, count: 99 }, now, OPTS);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);
    expect(result.newWindowStart).toBe(now.toISOString());
  });

  it("rolls over exactly at the window boundary", () => {
    const windowStart = "2026-06-11T11:50:00.000Z"; // exactly windowSec ago
    const result = evaluateWindow({ windowStart, count: 3 }, now, OPTS);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);
  });

  it("treats an unparseable window start as a new window", () => {
    const result = evaluateWindow({ windowStart: "garbage", count: 5 }, now, OPTS);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);
  });
});
