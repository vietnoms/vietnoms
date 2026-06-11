import { describe, it, expect } from "vitest";
import { buildReplyTemplates } from "@/lib/marketing/reply-templates";

describe("buildReplyTemplates", () => {
  it("uses the reviewer's first name", () => {
    const templates = buildReplyTemplates({ authorName: "Jane Doe", rating: 5 });
    for (const template of templates) {
      expect(template.text).toContain("Jane");
      expect(template.text).not.toContain("Doe");
    }
  });

  it("never produces 'undefined' or empty text", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      for (const authorName of ["", "  ", "Madonna", "Nguyen Van A"]) {
        const templates = buildReplyTemplates({ authorName, rating });
        expect(templates.length).toBeGreaterThan(0);
        for (const template of templates) {
          expect(template.text.length).toBeGreaterThan(20);
          expect(template.text).not.toContain("undefined");
        }
      }
    }
  });

  it("offers gratitude for high ratings and recovery for low ones", () => {
    const high = buildReplyTemplates({ authorName: "Sam", rating: 5 });
    expect(high.some((t) => /thank/i.test(t.text))).toBe(true);

    const low = buildReplyTemplates({ authorName: "Sam", rating: 1 });
    expect(low.some((t) => /sorry/i.test(t.text))).toBe(true);
    expect(low.every((t) => t.text.includes("catering@vietnoms.com"))).toBe(true);
  });
});
