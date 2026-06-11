"use client";

import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";

/**
 * Post-purchase review request configuration, stored in site_content.
 */
export function ReviewRequestSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [delayHours, setDelayHours] = useState("3");
  const [channel, setChannel] = useState("email");
  const [suppressionDays, setSuppressionDays] = useState("30");

  useEffect(() => {
    fetch("/api/admin/content")
      .then((res) => res.json())
      .then(({ content }) => {
        setEnabled(content.review_requests_enabled === "true");
        setDelayHours(content.review_request_delay_hours || "3");
        setChannel(content.review_request_channel || "email");
        setSuppressionDays(content.review_suppression_days || "30");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: {
          review_requests_enabled: String(enabled),
          review_request_delay_hours: delayHours,
          review_request_channel: channel,
          review_suppression_days: suppressionDays,
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-surface p-5 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-white">
            Automated Review Requests
          </h3>
          <p className="text-sm text-gray-400">
            After each paid online order, ask the customer how it went. Happy
            customers (4–5★) are sent to Google/Yelp; unhappy ones (1–3★) go to
            your private inbox instead.
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          role="switch"
          aria-checked={enabled}
          className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-brand-red" : "bg-gray-700"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Delay after order (hours)
          </label>
          <input
            type="number"
            min="1"
            max="72"
            value={delayHours}
            onChange={(e) => setDelayHours(e.target.value)}
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          >
            <option value="email">Email</option>
            <option value="sms">Text (requires SMS opt-in)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Don&apos;t re-ask within (days)
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={suppressionDays}
            onChange={(e) => setSuppressionDays(e.target.value)}
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Requests send via the daily cron (or shortly after the next order).
        Texts are only sent to customers who checked the SMS opt-in box at
        checkout.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
