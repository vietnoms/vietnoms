"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Check, ImageIcon, X } from "lucide-react";

interface MediaItem {
  id: number;
  blobUrl: string;
  filename: string;
  altText: string;
  category: string;
}

// Content keys and their defaults
const FIELDS: Record<string, { label: string; type: "text" | "textarea" | "image"; default: string; section: string }> = {
  // Hero
  hero_title: { label: "Hero Title", type: "text", default: "Authentic\nVietnamese\nCuisine", section: "Hero Section" },
  hero_subtitle: { label: "Hero Subtitle", type: "textarea", default: "Bun bowls, crispy banh mi, nuoc mam wings, and Vietnamese coffee. Made with love in San Jose.", section: "Hero Section" },

  // Featured Dishes
  featured_heading: { label: "Heading", type: "text", default: "Signature Dishes", section: "Featured Dishes" },
  featured_subtext: { label: "Subtext", type: "textarea", default: "Explore our most-loved dishes, made fresh daily with authentic Vietnamese flavors.", section: "Featured Dishes" },
  featured_names: { label: "Featured Items (comma-separated)", type: "text", default: "Bun Bowl, Nuoc Mam Wings, The Big Classic, Banh Mi", section: "Featured Dishes" },

  // About
  about_heading: { label: "Heading", type: "text", default: "Our Story", section: "About Section" },
  about_text1: { label: "Paragraph 1", type: "textarea", default: "", section: "About Section" },
  about_text2: { label: "Paragraph 2", type: "textarea", default: "", section: "About Section" },
  about_image: { label: "Photo", type: "image", default: "", section: "About Section" },

  // Ordering Callout
  ordering_heading: { label: "Heading", type: "text", default: "Order Online for Pickup", section: "Order Callout" },
  ordering_text: { label: "Description", type: "textarea", default: "Skip the wait. Order your favorite Vietnamese dishes online and pick them up fresh and ready.", section: "Order Callout" },
  ordering_button: { label: "Button Text", type: "text", default: "Start Your Order", section: "Order Callout" },

  // Catering Banner
  catering_heading: { label: "Heading", type: "text", default: "Catering for Your Next Event", section: "Catering Banner" },
  catering_text: { label: "Description", type: "textarea", default: "From corporate lunches to wedding celebrations, our Vietnamese catering brings bold flavors to any occasion.", section: "Catering Banner" },
  catering_image: { label: "Photo", type: "image", default: "", section: "Catering Banner" },
};

export function HomepageEditor() {
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

  const getValue = (key: string): string => {
    return content[key] ?? "";
  };

  const setValue = (key: string, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
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

  // Group fields by section
  const sections: Record<string, { key: string; config: typeof FIELDS[string] }[]> = {};
  for (const [key, config] of Object.entries(FIELDS)) {
    const section = config.section;
    if (!sections[section]) sections[section] = [];
    sections[section].push({ key, config });
  }

  return (
    <div className="space-y-8">
      {Object.entries(sections).map(([sectionName, fields]) => (
        <div key={sectionName} className="bg-surface-alt border border-gray-700 rounded-lg p-5">
          <h2 className="font-display text-lg font-bold text-white mb-4">{sectionName}</h2>
          <div className="space-y-4">
            {fields.map(({ key, config }) => (
              <div key={key}>
                <Label>{config.label}</Label>
                {config.type === "text" && (
                  <Input
                    value={getValue(key)}
                    onChange={(e) => setValue(key, e.target.value)}
                    placeholder={config.default}
                  />
                )}
                {config.type === "textarea" && (
                  <Textarea
                    value={getValue(key)}
                    onChange={(e) => setValue(key, e.target.value)}
                    placeholder={config.default}
                    rows={3}
                  />
                )}
                {config.type === "image" && (
                  <div className="flex items-center gap-3 mt-1">
                    {getValue(key) ? (
                      <div className="relative h-20 w-32 rounded-md overflow-hidden bg-gray-800">
                        <img src={getValue(key)} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => setValue(key, "")}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => openMediaPicker(key)}>
                      <ImageIcon className="h-4 w-4 mr-1" />
                      {getValue(key) ? "Change" : "Select"} Image
                    </Button>
                  </div>
                )}
                {!getValue(key) && config.default && config.type !== "image" && (
                  <p className="text-xs text-gray-500 mt-1">Default: {config.default.substring(0, 80)}{config.default.length > 80 ? "..." : ""}</p>
                )}
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
              <p className="text-gray-400 text-sm py-8 text-center">No media found. Upload images in the Media manager first.</p>
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
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : saved ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
