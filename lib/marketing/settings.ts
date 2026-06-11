import { unstable_cache } from "next/cache";
import { getAllContent } from "@/lib/db/site-content";

/**
 * Typed marketing settings stored in the site_content key/value table.
 * Admin saves go through /api/admin/content (or dedicated routes) which
 * revalidateTag("site-content") so changes apply immediately.
 */

export interface MarketingSettings {
  popupEnabled: boolean;
  popupDelaySeconds: number;
  popupHeadline: string;
  popupOffer: string;
  reviewRequestsEnabled: boolean;
  reviewRequestDelayHours: number;
  reviewRequestChannel: "email" | "sms" | "both";
  reviewSuppressionDays: number;
  staffPicks: string[]; // menu item names
  allergenNote: string;
  pressMentions: { outlet: string; quote: string; url?: string }[];
  loyaltyTerms: string;
  careersRoles: { title: string; type: string; description: string }[];
}

export const MARKETING_DEFAULTS: MarketingSettings = {
  popupEnabled: false,
  popupDelaySeconds: 15,
  popupHeadline: "Join the Noms List",
  popupOffer:
    "[FILL IN: incentive offer — e.g. 10% off your first online order when you join]",
  reviewRequestsEnabled: false,
  reviewRequestDelayHours: 3,
  reviewRequestChannel: "email",
  reviewSuppressionDays: 30,
  staffPicks: [],
  allergenNote:
    "[FILL IN: allergen note — e.g. Many dishes contain fish sauce, peanuts, or gluten. Tell us about allergies and we'll guide you.]",
  pressMentions: [],
  loyaltyTerms:
    "[FILL IN: loyalty program terms — earning rate, redemption rules, expiration policy]",
  careersRoles: [],
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function parseNum(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseChannel(
  value: string | undefined,
  fallback: "email" | "sms" | "both"
): "email" | "sms" | "both" {
  if (value === "email" || value === "sms" || value === "both") return value;
  return fallback;
}

export function settingsFromContent(
  content: Record<string, string>
): MarketingSettings {
  const d = MARKETING_DEFAULTS;
  return {
    popupEnabled: parseBool(content.popup_enabled, d.popupEnabled),
    popupDelaySeconds: parseNum(content.popup_delay_seconds, d.popupDelaySeconds),
    popupHeadline: content.popup_headline || d.popupHeadline,
    popupOffer: content.popup_offer || d.popupOffer,
    reviewRequestsEnabled: parseBool(
      content.review_requests_enabled,
      d.reviewRequestsEnabled
    ),
    reviewRequestDelayHours: parseNum(
      content.review_request_delay_hours,
      d.reviewRequestDelayHours
    ),
    reviewRequestChannel: parseChannel(
      content.review_request_channel,
      d.reviewRequestChannel
    ),
    reviewSuppressionDays: parseNum(
      content.review_suppression_days,
      d.reviewSuppressionDays
    ),
    staffPicks: parseJson(content.staff_picks, d.staffPicks),
    allergenNote: content.allergen_note || d.allergenNote,
    pressMentions: parseJson(content.press_mentions, d.pressMentions),
    loyaltyTerms: content.loyalty_terms || d.loyaltyTerms,
    careersRoles: parseJson(content.careers_roles, d.careersRoles),
  };
}

/**
 * Cached settings read. Returns defaults when the database is unavailable
 * so the site builds and renders with zero configuration.
 */
export const getMarketingSettings = unstable_cache(
  async (): Promise<MarketingSettings> => {
    try {
      const content = await getAllContent();
      return settingsFromContent(content);
    } catch (error) {
      console.error("Failed to load marketing settings, using defaults:", error);
      return MARKETING_DEFAULTS;
    }
  },
  ["marketing-settings"],
  { tags: ["site-content"], revalidate: 300 }
);
