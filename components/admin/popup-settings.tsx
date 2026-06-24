"use client";

import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";

/**
 * Signup popup configuration, stored in site_content via /api/admin/content.
 */
export function PopupSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState("15");
  const [headline, setHeadline] = useState("");
  const [offer, setOffer] = useState("");

  useEffect(() => {
    fetch("/api/admin/content")
      .then((res) => res.json())
      .then(({ content }) => {
        setEnabled(content.popup_enabled === "true");
        setDelaySeconds(content.popup_delay_seconds || "15");
        setHeadline(content.popup_headline || "Join the Noms List");
        setOffer(content.popup_offer || "");
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
          popup_enabled: String(enabled),
          popup_delay_seconds: delaySeconds,
          popup_headline: headline,
          popup_offer: offer,
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
    <div className="rounded-lg border border-gray-800 bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-white">
            Signup Popup
          </h3>
          <p className="text-sm text-gray-400">
            Shows once per visitor after a delay (or 50% scroll). Suppressed on
            checkout, feedback, and admin pages.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Delay before showing (seconds)
          </label>
          <input
            type="number"
            min="3"
            max="120"
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(e.target.value)}
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Headline</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Offer / incentive copy
        </label>
        <textarea
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          rows={2}
          placeholder="e.g. Get 10% off your first online order when you join."
          className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none"
        />
        {offer.startsWith("[FILL IN") && (
          <p className="mt-1 text-xs text-amber-400">
            Placeholder copy — replace with your real offer before enabling the
            popup. (Generic copy is shown to visitors until you do.)
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Popup Settings
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
