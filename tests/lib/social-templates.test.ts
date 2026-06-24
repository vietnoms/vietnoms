import { describe, it, expect } from "vitest";
import { draftFromMenuItem, draftFromSpecial } from "@/lib/social/templates";

describe("draftFromMenuItem", () => {
  const item = {
    name: "Nuoc Mam Wings",
    description: "Crispy wings tossed in fish-sauce caramel",
    formattedPrice: "$12.00",
  };

  it("produces multiple variants containing the item name", () => {
    const drafts = draftFromMenuItem(item);
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    for (const draft of drafts) {
      expect(draft).toContain("Nuoc Mam Wings");
      expect(draft).not.toContain("undefined");
      expect(draft).not.toContain("null");
    }
  });

  it("includes ordering call-to-action and hashtags", () => {
    for (const draft of draftFromMenuItem(item)) {
      expect(draft.toLowerCase()).toContain("order");
      expect(draft).toContain("#vietnoms");
    }
  });

  it("stays within Instagram's caption limit", () => {
    const longItem = {
      name: "Test Dish",
      description: "x".repeat(5000),
      formattedPrice: "$10.00",
    };
    for (const draft of draftFromMenuItem(longItem)) {
      expect(draft.length).toBeLessThanOrEqual(2200);
    }
  });

  it("handles missing description and price gracefully", () => {
    for (const draft of draftFromMenuItem({ name: "Banh Mi" })) {
      expect(draft).toContain("Banh Mi");
      expect(draft).not.toContain("undefined");
      expect(draft).not.toMatch(/\(\)/);
    }
  });
});

describe("draftFromSpecial", () => {
  it("mentions the end date when present", () => {
    const drafts = draftFromSpecial({
      title: "Pho Friday",
      body: "$2 off all pho",
      endsAt: "2026-06-19T12:00:00Z",
    });
    for (const draft of drafts) {
      expect(draft).toContain("Pho Friday");
      expect(draft).toContain("June");
    }
  });

  it("falls back to generic urgency without an end date", () => {
    const drafts = draftFromSpecial({ title: "New Banh Mi", endsAt: null });
    for (const draft of drafts) {
      expect(draft).toContain("Limited time");
      expect(draft).not.toContain("undefined");
    }
  });
});
