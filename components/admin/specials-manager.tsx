"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";

interface Announcement {
  id: number;
  type: "announcement" | "special";
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  priority: number;
}

interface MediaItem {
  id: number;
  blobUrl: string;
  posterUrl: string | null;
  filename: string;
  altText: string;
}

const EMPTY_FORM = {
  type: "special" as "announcement" | "special",
  title: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaHref: "/order",
  startsAt: "",
  endsAt: "",
  active: true,
  priority: 0,
};

function statusChip(entry: Announcement): { label: string; classes: string } {
  if (!entry.active) {
    return { label: "Disabled", classes: "bg-gray-600/20 text-gray-400" };
  }
  const now = Date.now();
  if (entry.startsAt && Date.parse(entry.startsAt) > now) {
    return { label: "Scheduled", classes: "bg-blue-600/20 text-blue-400" };
  }
  if (entry.endsAt && Date.parse(entry.endsAt) < now) {
    return { label: "Expired", classes: "bg-orange-600/20 text-orange-400" };
  }
  return { label: "Live", classes: "bg-green-600/20 text-green-400" };
}

/** Convert stored ISO to datetime-local input value (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function SpecialsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [annRes, mediaRes] = await Promise.all([
      fetch("/api/admin/announcements"),
      fetch("/api/admin/media?limit=100"),
    ]);
    if (annRes.ok) {
      const data = await annRes.json();
      setAnnouncements(data.announcements);
    }
    if (mediaRes.ok) {
      const data = await mediaRes.json();
      setMedia(data.media || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
    setError("");
  };

  const openEdit = (entry: Announcement) => {
    setForm({
      type: entry.type,
      title: entry.title,
      body: entry.body || "",
      imageUrl: entry.imageUrl || "",
      ctaLabel: entry.ctaLabel || "",
      ctaHref: entry.ctaHref || "",
      startsAt: toLocalInput(entry.startsAt),
      endsAt: toLocalInput(entry.endsAt),
      active: entry.active,
      priority: entry.priority,
    });
    setEditingId(entry.id);
    setFormOpen(true);
    setError("");
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      type: form.type,
      title: form.title.trim(),
      body: form.body.trim() || null,
      imageUrl: form.imageUrl || null,
      ctaLabel: form.ctaLabel.trim() || null,
      ctaHref: form.ctaHref.trim() || null,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      active: form.active,
      priority: Number(form.priority) || 0,
    };

    const res = editingId
      ? await fetch(`/api/admin/announcements/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/announcements", {
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
    setFormOpen(false);
    fetchAll();
  };

  const remove = async (entry: Announcement) => {
    if (!confirm(`Delete "${entry.title}"?`)) return;
    await fetch(`/api/admin/announcements/${entry.id}`, { method: "DELETE" });
    fetchAll();
  };

  const toggleActive = async (entry: Announcement) => {
    await fetch(`/api/admin/announcements/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !entry.active }),
    });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400 max-w-xl">
          Specials show on the homepage and{" "}
          <span className="text-gray-300">/specials</span>; announcements show
          as a bar at the top of the homepage. Set a start/end window and
          they publish and expire automatically.
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {/* Editor */}
      {formOpen && (
        <div className="rounded-lg border border-gray-700 bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white">
              {editingId ? "Edit" : "New"}{" "}
              {form.type === "special" ? "Special" : "Announcement"}
            </h3>
            <button
              onClick={() => setFormOpen(false)}
              className="text-gray-400 hover:text-white"
              aria-label="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as typeof form.type })
                }
                className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
              >
                <option value="special">Special (homepage card + /specials)</option>
                <option value="announcement">Announcement (top bar)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Priority (higher shows first)
              </label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Pho Friday — $2 off all pho"
              className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={2}
              placeholder="Short description shown under the title"
              className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                CTA label
              </label>
              <input
                type="text"
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="Order Now"
                className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                CTA link
              </label>
              <input
                type="text"
                value={form.ctaHref}
                onChange={(e) => setForm({ ...form, ctaHref: e.target.value })}
                placeholder="/order"
                className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Starts (blank = now)
              </label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Ends (blank = never)
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Image picker (specials only) */}
          {form.type === "special" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Image</label>
              <div className="flex items-center gap-3">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
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
                {form.imageUrl && (
                  <button
                    onClick={() => setForm({ ...form, imageUrl: "" })}
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
                  {media.map((item) => {
                    const url = item.posterUrl || item.blobUrl;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setForm({ ...form, imageUrl: url });
                          setPickerOpen(false);
                        }}
                        className="aspect-square rounded-md overflow-hidden border border-transparent hover:border-brand-red transition-colors"
                        title={item.filename}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={item.altText || item.filename}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded accent-[#ff3333]"
            />
            Active
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingId ? "Save Changes" : "Create"}
          </button>
        </div>
      )}

      {/* List */}
      {announcements.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No specials or announcements yet</p>
          <p className="mt-2 text-sm">
            Create your first one — try a limited-time offer with an end date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((entry) => {
            const chip = statusChip(entry);
            return (
              <div
                key={entry.id}
                className="flex items-center gap-4 rounded-lg border border-gray-800 bg-surface p-4"
              >
                {entry.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover border border-gray-700 flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white truncate">
                      {entry.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${chip.classes}`}
                    >
                      {chip.label}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {entry.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {entry.startsAt
                      ? `${entry.startsAt.slice(0, 10)} → `
                      : "Now → "}
                    {entry.endsAt ? entry.endsAt.slice(0, 10) : "no end"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(entry)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {entry.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => openEdit(entry)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(entry)}
                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
