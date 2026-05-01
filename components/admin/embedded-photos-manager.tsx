"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Check, ImageIcon, X } from "lucide-react";

interface MediaItem {
  id: number;
  blobUrl: string;
  filename: string;
  altText: string;
  category: string;
}

const PHOTO_SLOTS = [
  { key: "og_image", label: "Social Share Thumbnail (OG Image)", page: "Site-wide" },
  { key: "about_image", label: "About Section Photo", page: "Homepage" },
  { key: "catering_image", label: "Catering Banner Photo", page: "Homepage" },
  { key: "catering_hero_image", label: "Hero Image", page: "Catering" },
  { key: "catering_buffet_image", label: "Buffet Style Image", page: "Catering" },
  { key: "catering_premade_image", label: "Pre-made Bowls Image", page: "Catering" },
];

export function EmbeddedPhotosManager() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mediaPickerFor, setMediaPickerFor] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || {});
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.media || []);
      }
    } catch {}
  }, []);

  const getValue = (key: string): string => content[key] ?? "";

  const setValue = (key: string, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const imageContent: Record<string, string> = {};
      for (const slot of PHOTO_SLOTS) {
        if (content[slot.key] !== undefined) {
          imageContent[slot.key] = content[slot.key];
        }
      }
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: imageContent }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {} finally { setSaving(false); }
  };

  const openMediaPicker = (key: string) => {
    setMediaPickerFor(key);
    fetchMedia();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Group slots by page
  const groups: Record<string, typeof PHOTO_SLOTS> = {};
  for (const slot of PHOTO_SLOTS) {
    if (!groups[slot.page]) groups[slot.page] = [];
    groups[slot.page].push(slot);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Embedded Photos</h2>
        <p className="mt-1 text-gray-400 text-sm">
          Manage the images embedded across the site. Select an image from the media library for each slot.
        </p>
      </div>

      {Object.entries(groups).map(([pageName, slots]) => (
        <div key={pageName} className="bg-surface-alt border border-gray-700 rounded-lg p-5">
          <h3 className="font-display text-lg font-bold text-white mb-4">{pageName}</h3>
          <div className="space-y-4">
            {slots.map((slot) => (
              <div key={slot.key}>
                <Label>{slot.label}</Label>
                <div className="flex items-center gap-3 mt-1">
                  {getValue(slot.key) ? (
                    <div className="relative h-20 w-32 rounded-md overflow-hidden bg-gray-800">
                      <img src={getValue(slot.key)} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setValue(slot.key, "")}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => openMediaPicker(slot.key)}>
                    <ImageIcon className="h-4 w-4 mr-1" />
                    {getValue(slot.key) ? "Change" : "Select"} Image
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Media Picker Modal */}
      {mediaPickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setMediaPickerFor(null)}>
          <div className="bg-surface-high border border-gray-700 rounded-lg p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Select Image</h3>
              <button onClick={() => setMediaPickerFor(null)} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            {mediaItems.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No media found. Upload images in the Media library below.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {mediaItems.filter((m) => !m.filename.match(/\.(mp4|webm|mov)$/i)).map((m) => (
                  <button key={m.id} onClick={() => { setValue(mediaPickerFor, m.blobUrl); setMediaPickerFor(null); }}
                    className="relative aspect-square rounded-md overflow-hidden border border-gray-700 hover:border-brand-red transition-colors">
                    <img src={m.blobUrl} alt={m.altText} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : saved ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
