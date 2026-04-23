"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { upload } from "@vercel/blob/client";
import {
  GripVertical,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Layers,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSlide {
  id: number;
  blobUrl: string;
  filename: string;
  altText: string;
  galleryVisible: number;
  galleryOrder: number;
  sizeBytes: number | null;
  blobUrlAv1?: string | null;
  blobUrlWebm?: string | null;
  blobUrlMobile?: string | null;
  posterUrl?: string | null;
}

type VariantSlot = "blobUrlAv1" | "blobUrlWebm" | "blobUrlMobile" | "posterUrl";

interface VariantSlotDef {
  key: VariantSlot;
  label: string;
  hint: string;
  accept: string;
}

const VARIANT_SLOTS: VariantSlotDef[] = [
  { key: "blobUrlAv1",    label: "AV1 WebM (desktop)",  hint: "1080p, ~1\u20133 MB",   accept: "video/webm" },
  { key: "blobUrlWebm",   label: "VP9 WebM (desktop)",  hint: "1080p fallback",        accept: "video/webm" },
  { key: "blobUrlMobile", label: "H.264 MP4 (mobile)",  hint: "720p, <1 MB",           accept: "video/mp4" },
  { key: "posterUrl",     label: "Poster (WebP)",       hint: "First-frame still",     accept: "image/webp,image/jpeg,image/png" },
];

const TRANSITION_STYLES = [
  { value: "crossfade", label: "Crossfade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Ken Burns (Zoom)" },
];

function isVideo(filename: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(filename);
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return fallback; }
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.error || json.message || text.slice(0, 300);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function HeroManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [allMedia, setAllMedia] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [transitionStyle, setTransitionStyle] = useState("crossfade");
  const [interval, setInterval_] = useState(6);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null); // `${id}:${slot}`
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media?category=hero");
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.media || []).sort(
          (a: HeroSlide, b: HeroSlide) => a.galleryOrder - b.galleryOrder
        );
        setSlides(sorted);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchAllMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) {
        const data = await res.json();
        setAllMedia((data.media || []).filter(
          (m: HeroSlide) => m.galleryVisible && !slides.some((s) => s.id === m.id)
        ));
      }
    } catch {}
  }, [slides]);

  useEffect(() => { fetchSlides(); }, [fetchSlides]);

  // Save slide settings (visibility, order)
  const updateSlide = async (id: number, updates: Record<string, unknown>) => {
    setSaving(id);
    try {
      await fetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await fetchSlides();
    } catch {} finally { setSaving(null); }
  };

  // Upload a variant file (AV1/VP9/mobile/poster) and attach to existing slide
  const uploadVariant = async (slide: HeroSlide, slot: VariantSlot, file: File) => {
    const key = `${slide.id}:${slot}`;
    setUploadingVariant(key);
    setUploadError(null);
    try {
      const blob = await upload(`media/variants/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/media/upload-token",
      });
      const res = await fetch(`/api/admin/media/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [slot]: blob.url }),
      });
      if (!res.ok) {
        throw new Error(`PATCH failed: ${await readErrorBody(res)}`);
      }
      await fetchSlides();
    } catch (err) {
      const msg = describeError(err, "Unknown variant upload error");
      console.error(`[hero-manager] variant upload failed (${slot}, ${file.name}): ${msg}`, err);
      setUploadError(`${slot} (${file.name}): ${msg}`);
    } finally {
      setUploadingVariant(null);
    }
  };

  const removeVariant = async (slide: HeroSlide, slot: VariantSlot) => {
    const key = `${slide.id}:${slot}`;
    setUploadingVariant(key);
    setUploadError(null);
    try {
      const res = await fetch(`/api/admin/media/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [slot]: null }),
      });
      if (!res.ok) {
        throw new Error(`PATCH failed: ${await readErrorBody(res)}`);
      }
      await fetchSlides();
    } catch (err) {
      const msg = describeError(err, "Unknown remove-variant error");
      console.error(`[hero-manager] variant remove failed (${slot}): ${msg}`, err);
      setUploadError(`Remove ${slot}: ${msg}`);
    } finally {
      setUploadingVariant(null);
    }
  };

  // Drag and drop reorder
  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOver.current = index; };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const reordered = [...slides];
    const [dragged] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;

    // Update order for all items
    setSlides(reordered);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].galleryOrder !== i + 1) {
        await fetch(`/api/admin/media/${reordered[i].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ galleryOrder: i + 1 }),
        });
      }
    }
    await fetchSlides();
  };

  // Upload new hero media
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const isVid = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
        if (isVid) {
          const blob = await upload(`media/${Date.now()}-${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/admin/media/upload-token",
          });
          const res = await fetch("/api/admin/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blobUrl: blob.url,
              filename: file.name,
              altText: "",
              category: "hero",
              tags: "",
              sizeBytes: file.size,
            }),
          });
          if (!res.ok) {
            throw new Error(`DB register failed: ${await readErrorBody(res)}`);
          }
        } else {
          const formData = new FormData();
          formData.append("file", file, file.name);
          formData.append("category", "hero");
          formData.append("altText", "");
          const res = await fetch("/api/admin/media", { method: "POST", body: formData });
          if (!res.ok) {
            throw new Error(`Upload failed: ${await readErrorBody(res)}`);
          }
        }

        await fetchSlides();
      } catch (err) {
        const msg = describeError(err, "Unknown upload error");
        console.error(`[hero-manager] upload failed for ${file.name}: ${msg}`, err);
        setUploadError(`${file.name}: ${msg}`);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    await fetchSlides();
  };

  // Add existing media as hero slide
  const addFromLibrary = async (media: HeroSlide) => {
    const maxOrder = slides.reduce((m, s) => Math.max(m, s.galleryOrder), 0);
    await updateSlide(media.id, {
      category: "hero",
      galleryVisible: 1,
      galleryOrder: maxOrder + 1,
    });
    setShowMediaPicker(false);
  };

  // Remove from hero (set category back to uncategorized)
  const removeSlide = async (id: number) => {
    await updateSlide(id, { category: "uncategorized", galleryVisible: 0, galleryOrder: 0 });
  };

  // Toggle visibility
  const toggleVisibility = async (slide: HeroSlide) => {
    await updateSlide(slide.id, { galleryVisible: slide.galleryVisible ? 0 : 1 });
  };

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {uploadError && (
        <div className="flex items-start gap-3 bg-red-950/60 border border-red-800 rounded-md px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-200">Upload failed</p>
            <p className="text-sm text-red-100 break-words whitespace-pre-wrap font-mono">{uploadError}</p>
            <p className="text-xs text-red-300/70 mt-1">
              Check your browser DevTools console for the full stack trace. Common causes: missing
              {" "}<span className="font-mono">BLOB_READ_WRITE_TOKEN</span> env var, admin session expired, or file over 100 MB.
            </p>
          </div>
          <button onClick={() => setUploadError(null)}
            className="p-1 rounded hover:bg-red-900/60 text-red-200 hover:text-white shrink-0"
            title="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Transition Style</label>
          <select
            value={transitionStyle}
            onChange={(e) => setTransitionStyle(e.target.value)}
            className="px-3 py-1.5 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          >
            {TRANSITION_STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Image Duration (sec)</label>
          <input
            type="number"
            min={2}
            max={30}
            value={interval}
            onChange={(e) => setInterval_(Number(e.target.value))}
            className="w-20 px-3 py-1.5 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowMediaPicker(true); fetchAllMedia(); }}>
            <ImageIcon className="h-4 w-4 mr-1" />
            From Library
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload New
          </Button>
          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple
            className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <Button variant="outline" size="sm" onClick={fetchSlides}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Media picker modal */}
      {showMediaPicker && (
        <div className="bg-surface-alt border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Select from Media Library</h3>
            <button onClick={() => setShowMediaPicker(false)} className="text-gray-400 hover:text-white">&times;</button>
          </div>
          {allMedia.length === 0 ? (
            <p className="text-sm text-gray-400">No other media available. Upload new files above.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
              {allMedia.map((m) => (
                <button key={m.id} onClick={() => addFromLibrary(m)}
                  className="relative aspect-square rounded-md overflow-hidden border border-gray-700 hover:border-brand-red transition-colors">
                  {isVideo(m.filename) ? (
                    <video src={m.blobUrl} muted className="h-full w-full object-cover" />
                  ) : (
                    <img src={m.blobUrl} alt={m.altText} className="h-full w-full object-cover" />
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[10px] text-gray-300 truncate">
                    {m.filename}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slides list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : slides.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-700 rounded-lg">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No hero slides configured.</p>
          <p className="text-sm text-gray-500 mt-1">Upload videos or images, or select from your media library.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {slides.map((slide, index) => {
            const slideIsVideo = isVideo(slide.filename);
            const variantsAttached = slideIsVideo
              ? VARIANT_SLOTS.filter((s) => slide[s.key]).length
              : 0;
            const isExpanded = expandedId === slide.id;
            return (
              <div key={slide.id} className="space-y-0">
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`flex items-center gap-3 bg-surface-alt border border-gray-700 ${
                    isExpanded ? "rounded-t-lg border-b-0" : "rounded-lg"
                  } p-3 transition-colors ${!slide.galleryVisible ? "opacity-50" : ""}`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab text-gray-500 hover:text-gray-300">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Order number */}
                  <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-400 shrink-0">
                    {index + 1}
                  </div>

                  {/* Preview */}
                  <div className="relative h-16 w-28 rounded-md overflow-hidden shrink-0 bg-gray-800">
                    {slideIsVideo ? (
                      <>
                        <video src={slide.blobUrl} muted className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white/80" />
                        </div>
                      </>
                    ) : (
                      <img src={slide.blobUrl} alt={slide.altText} className="h-full w-full object-cover" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{slide.filename}</p>
                    <p className="text-xs text-gray-500">
                      {slideIsVideo ? "Video" : "Image"}
                      {slide.sizeBytes ? ` \u00b7 ${formatSize(slide.sizeBytes)}` : ""}
                      {slideIsVideo && (
                        <span className={variantsAttached === VARIANT_SLOTS.length ? "text-green-400" : "text-amber-400"}>
                          {" \u00b7 "}
                          {variantsAttached}/{VARIANT_SLOTS.length} variants
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {saving === slide.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        {slideIsVideo && (
                          <button onClick={() => setExpandedId(isExpanded ? null : slide.id)}
                            className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${
                              isExpanded ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                            }`}
                            title="Manage codec variants">
                            <Layers className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => toggleVisibility(slide)}
                          className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          title={slide.galleryVisible ? "Hide from slideshow" : "Show in slideshow"}>
                          {slide.galleryVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button onClick={() => removeSlide(slide.id)}
                          className="p-2 rounded-md hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove from hero">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Variants panel */}
                {isExpanded && slideIsVideo && (
                  <div className="bg-surface-alt border border-gray-700 rounded-b-lg p-3 space-y-2">
                    <p className="text-xs text-gray-400 mb-2">
                      Attach re-encoded variants. Browsers pick the smallest playable format.
                      The base MP4 (<span className="font-mono text-gray-300">blob_url</span>) is always used as the final fallback.
                    </p>
                    {VARIANT_SLOTS.map((slotDef) => {
                      const url = slide[slotDef.key];
                      const busyKey = `${slide.id}:${slotDef.key}`;
                      const busy = uploadingVariant === busyKey;
                      return (
                        <div key={slotDef.key}
                          className="flex items-center gap-3 bg-gray-900/40 border border-gray-800 rounded-md p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{slotDef.label}</p>
                            <p className="text-xs text-gray-500">
                              {slotDef.hint}
                              {url ? (
                                <>{" \u00b7 "}<span className="text-green-400">attached</span></>
                              ) : (
                                <>{" \u00b7 "}<span className="text-gray-500">not uploaded</span></>
                              )}
                            </p>
                          </div>
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : url ? (
                            <>
                              <a href={url} target="_blank" rel="noreferrer"
                                className="text-xs text-gray-400 hover:text-white px-2 py-1 underline">
                                view
                              </a>
                              <button onClick={() => removeVariant(slide, slotDef.key)}
                                className="p-1.5 rounded-md hover:bg-red-900/30 text-gray-400 hover:text-red-400"
                                title="Remove variant">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <label className="cursor-pointer inline-flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-white px-2.5 py-1.5 rounded-md">
                              <Upload className="h-3.5 w-3.5" />
                              Upload
                              <input type="file" className="hidden" accept={slotDef.accept}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadVariant(slide, slotDef.key, f);
                                  e.target.value = "";
                                }} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview */}
      {slides.filter((s) => s.galleryVisible).length > 0 && (
        <div>
          <h3 className="font-semibold text-white mb-2">Preview</h3>
          <div className="relative aspect-[21/9] rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
            {(() => {
              const visible = slides.filter((s) => s.galleryVisible);
              const first = visible[0];
              if (!first) return null;
              return isVideo(first.filename) ? (
                <video src={first.blobUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={first.blobUrl} alt={first.altText} className="h-full w-full object-cover" />
              );
            })()}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-3 left-3 text-white text-sm font-medium">
              {slides.filter((s) => s.galleryVisible).length} slide{slides.filter((s) => s.galleryVisible).length !== 1 ? "s" : ""} active
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Drag slides to reorder. Toggle the eye icon to show/hide individual slides.
        Videos play to completion before advancing. Images display for {interval} seconds each.
        The homepage will update within 5 minutes of changes.
      </p>
    </div>
  );
}
