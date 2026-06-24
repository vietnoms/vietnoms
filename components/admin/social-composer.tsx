"use client";

import { useState, useCallback } from "react";
import { Loader2, Wand2, X } from "lucide-react";
import { draftFromMenuItem } from "@/lib/social/templates";

export interface ComposerMenuItem {
  id: string;
  name: string;
  description: string;
  formattedPrice: string;
  imageUrl: string | null;
}

export interface ComposerMediaItem {
  id: number;
  url: string;
  filename: string;
}

export interface ComposerInitial {
  id?: number;
  title: string;
  body: string;
  mediaUrl: string;
  menuItemId: string;
  platforms: string[];
  scheduledAt: string; // datetime-local value
}

const IG_CAPTION_LIMIT = 2200;

function defaultScheduledAt(): string {
  // Tomorrow at 11:00 local — a good lunch-decision posting time
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(11, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyComposer(): ComposerInitial {
  return {
    title: "",
    body: "",
    mediaUrl: "",
    menuItemId: "",
    platforms: ["facebook"],
    scheduledAt: defaultScheduledAt(),
  };
}

interface SocialComposerProps {
  initial: ComposerInitial;
  menuItems: ComposerMenuItem[];
  media: ComposerMediaItem[];
  facebookConfigured: boolean;
  instagramConfigured: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SocialComposer({
  initial,
  menuItems,
  media,
  facebookConfigured,
  instagramConfigured,
  onClose,
  onSaved,
}: SocialComposerProps) {
  const [form, setForm] = useState(initial);
  const [draftIndex, setDraftIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedItem = menuItems.find((item) => item.id === form.menuItemId);

  const generateDraft = useCallback(() => {
    if (!selectedItem) return;
    const variants = draftFromMenuItem(selectedItem);
    setForm((prev) => ({ ...prev, body: variants[draftIndex % variants.length] }));
    setDraftIndex((index) => index + 1);
  }, [selectedItem, draftIndex]);

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const save = async (status: "draft" | "scheduled") => {
    setError("");
    if (!form.body.trim()) {
      setError("Caption is required");
      return;
    }
    if (form.platforms.length === 0) {
      setError("Select at least one platform");
      return;
    }
    if (form.platforms.includes("instagram") && !form.mediaUrl) {
      setError("Instagram posts require an image");
      return;
    }
    const scheduledDate = new Date(form.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      setError("Pick a valid date and time");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title,
      body: form.body,
      mediaUrl: form.mediaUrl || null,
      menuItemId: form.menuItemId || null,
      menuItemName: selectedItem?.name || null,
      platforms: form.platforms,
      scheduledAt: scheduledDate.toISOString(),
      status,
    };

    const res = form.id
      ? await fetch(`/api/admin/social-posts/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/social-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save");
      return;
    }
    onSaved();
  };

  const overLimit = form.body.length > IG_CAPTION_LIMIT;

  return (
    <div className="rounded-lg border border-gray-700 bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-white">
          {form.id ? "Edit Post" : "New Post"}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          aria-label="Close composer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Internal label (optional)
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Friday banh mi push"
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Featured menu item (for draft generation)
          </label>
          <div className="flex gap-2">
            <select
              value={form.menuItemId}
              onChange={(e) => {
                const item = menuItems.find((entry) => entry.id === e.target.value);
                setForm({
                  ...form,
                  menuItemId: e.target.value,
                  // Auto-attach the item's photo if no image picked yet
                  mediaUrl: form.mediaUrl || item?.imageUrl || "",
                });
                setDraftIndex(0);
              }}
              className="flex-1 min-w-0 px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
            >
              <option value="">None</option>
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              onClick={generateDraft}
              disabled={!selectedItem}
              title="Generate caption draft"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-brand-yellow/10 text-brand-yellow hover:bg-brand-yellow/20 disabled:opacity-40 transition-colors"
            >
              <Wand2 className="h-4 w-4" /> Draft
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-gray-400">Caption</label>
          <span
            className={`text-xs ${overLimit ? "text-red-400" : "text-gray-500"}`}
          >
            {form.body.length}/{IG_CAPTION_LIMIT}
          </span>
        </div>
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={6}
          placeholder="Write your caption, or pick a menu item and hit Draft..."
          className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Platforms</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.platforms.includes("facebook")}
                onChange={() => togglePlatform("facebook")}
                className="h-4 w-4 rounded accent-[#ff3333]"
              />
              Facebook
              {!facebookConfigured && (
                <span className="text-xs text-amber-400">(manual)</span>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.platforms.includes("instagram")}
                onChange={() => togglePlatform("instagram")}
                className="h-4 w-4 rounded accent-[#ff3333]"
              />
              Instagram
              {!instagramConfigured && (
                <span className="text-xs text-amber-400">(manual)</span>
              )}
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Publish at
          </label>
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Image picker */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Image{form.platforms.includes("instagram") ? " (required for Instagram)" : ""}
        </label>
        <div className="flex items-center gap-3">
          {form.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.mediaUrl}
              alt=""
              className="h-16 w-16 rounded-md object-cover border border-gray-700"
            />
          ) : (
            <div className="h-16 w-16 rounded-md bg-surface-alt border border-gray-700" />
          )}
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="px-3 py-1.5 rounded-md text-sm text-gray-300 border border-gray-700 hover:border-gray-500 transition-colors"
          >
            {pickerOpen ? "Close library" : "Choose from media library"}
          </button>
          {form.mediaUrl && (
            <button
              onClick={() => setForm({ ...form, mediaUrl: "" })}
              className="text-xs text-gray-500 hover:text-red-400"
            >
              Remove
            </button>
          )}
        </div>
        {pickerOpen && (
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 rounded-md border border-gray-800 bg-surface-alt">
            {media.length === 0 && (
              <p className="col-span-full text-sm text-gray-500 p-4">
                No media yet — upload images in the Media section.
              </p>
            )}
            {media.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setForm({ ...form, mediaUrl: item.url });
                  setPickerOpen(false);
                }}
                className="aspect-square rounded-md overflow-hidden border border-transparent hover:border-brand-red transition-colors"
                title={item.filename}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={() => save("scheduled")}
          disabled={saving || overLimit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Schedule
        </button>
        <button
          onClick={() => save("draft")}
          disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 border border-gray-700 hover:border-gray-500 disabled:opacity-60 transition-colors"
        >
          Save as Draft
        </button>
      </div>
    </div>
  );
}
