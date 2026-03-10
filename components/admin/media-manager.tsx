"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Upload, Trash2, Pencil, X, Check, Loader2, Eye, EyeOff } from "lucide-react";

interface MediaItem {
  id: number;
  blobUrl: string;
  filename: string;
  altText: string;
  category: string;
  tags: string | null;
  source: string;
  galleryVisible: number;
  galleryOrder: number;
  caption: string | null;
  createdAt: string;
}

const CATEGORIES = [
  "food",
  "interior",
  "events",
  "team",
  "marketing",
  "uncategorized",
];

export function MediaManager() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ altText: "", category: "", tags: "", caption: "", galleryOrder: 0 });
  const [filterGallery, setFilterGallery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadCategory, setUploadCategory] = useState("food");
  const [uploadTags, setUploadTags] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterSource) params.set("source", filterSource);

    const res = await fetch(`/api/admin/media?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMedia(data.media);
    }
    setLoading(false);
  }, [filterCategory, filterSource]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Clean up preview URLs
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setSelectedFiles(imageFiles);
    setPreviews(imageFiles.map((f) => URL.createObjectURL(f)));
  }

  function clearSelection() {
    setSelectedFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setUploadAlt("");
    setUploadCategory("food");
    setUploadTags("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("altText", uploadAlt);
      formData.set("category", uploadCategory);
      formData.set("tags", uploadTags);

      await fetch("/api/admin/media", { method: "POST", body: formData });
    }

    clearSelection();
    setUploading(false);
    fetchMedia();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMedia((prev) => prev.filter((m) => m.id !== id));
    }
  }

  function startEdit(item: MediaItem) {
    setEditingId(item.id);
    setEditForm({
      altText: item.altText,
      category: item.category,
      tags: item.tags || "",
      caption: item.caption || "",
      galleryOrder: item.galleryOrder ?? 0,
    });
  }

  async function toggleVisibility(item: MediaItem) {
    const newVal = item.galleryVisible ? 0 : 1;
    await fetch(`/api/admin/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ galleryVisible: newVal }),
    });
    setMedia((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, galleryVisible: newVal } : m))
    );
  }

  async function saveEdit(id: number) {
    await fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        altText: editForm.altText,
        category: editForm.category,
        tags: editForm.tags,
        caption: editForm.caption,
        galleryOrder: editForm.galleryOrder,
      }),
    });
    setEditingId(null);
    fetchMedia();
  }

  const filteredMedia = media.filter((m) => {
    if (filterGallery === "visible") return m.galleryVisible === 1;
    if (filterGallery === "hidden") return m.galleryVisible === 0;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? "border-brand-red bg-brand-red/5"
            : "border-gray-700 hover:border-gray-500"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFilesSelected(e.dataTransfer.files);
        }}
      >
        {selectedFiles.length === 0 ? (
          <>
            <Upload className="mx-auto h-10 w-10 text-gray-500 mb-3" />
            <p className="text-gray-400 mb-2">
              Drag and drop images here, or click to browse
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 bg-brand-red text-white rounded-md text-sm font-medium hover:bg-brand-red/90 transition-colors"
            >
              Choose Files
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </>
        ) : (
          <div className="space-y-4">
            {/* Previews */}
            <div className="flex flex-wrap gap-3 justify-center">
              {previews.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-md overflow-hidden">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400">
              {selectedFiles.length} file{selectedFiles.length !== 1 && "s"} selected
            </p>

            {/* Upload metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Alt Text</label>
                <input
                  type="text"
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  placeholder="Describe the image"
                  className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:border-brand-red focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tags</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="comma, separated"
                  className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:border-brand-red focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={clearSelection}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md text-sm hover:bg-surface-alt transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-brand-red text-white rounded-md text-sm font-medium hover:bg-brand-red/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload{selectedFiles.length > 1 ? ` ${selectedFiles.length} Files` : ""}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
        >
          <option value="">All Sources</option>
          <option value="upload">Uploaded</option>
          <option value="generated">AI Generated</option>
        </select>
        <select
          value={filterGallery}
          onChange={(e) => setFilterGallery(e.target.value)}
          className="px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
        >
          <option value="">Gallery: All</option>
          <option value="visible">Gallery: Visible</option>
          <option value="hidden">Gallery: Hidden</option>
        </select>
        <span className="text-sm text-gray-500 self-center">
          {filteredMedia.length} item{filteredMedia.length !== 1 && "s"}
        </span>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No media yet</p>
          <p className="text-sm mt-1">Upload images to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="group bg-surface-alt border border-gray-800 rounded-lg overflow-hidden"
            >
              <div className="relative aspect-square">
                <Image
                  src={item.blobUrl}
                  alt={item.altText}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleVisibility(item)}
                    className={`p-1.5 bg-black/70 rounded-md hover:bg-black/90 ${item.galleryVisible ? "text-white" : "text-gray-500"}`}
                    title={item.galleryVisible ? "Visible in gallery" : "Hidden from gallery"}
                  >
                    {item.galleryVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 bg-black/70 rounded-md text-white hover:bg-black/90"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 bg-black/70 rounded-md text-red-400 hover:bg-black/90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {item.galleryOrder > 0 && (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded">
                    #{item.galleryOrder}
                  </span>
                )}
                {item.source === "generated" && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-purple-600/80 text-white text-[10px] font-medium rounded">
                    AI
                  </span>
                )}
              </div>

              {editingId === item.id ? (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={editForm.altText}
                    onChange={(e) =>
                      setEditForm({ ...editForm, altText: e.target.value })
                    }
                    placeholder="Alt text"
                    className="w-full px-2 py-1 bg-surface border border-gray-700 rounded text-xs text-white focus:border-brand-red focus:outline-none"
                  />
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="w-full px-2 py-1 bg-surface border border-gray-700 rounded text-xs text-white focus:border-brand-red focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tags: e.target.value })
                    }
                    placeholder="Tags (comma separated)"
                    className="w-full px-2 py-1 bg-surface border border-gray-700 rounded text-xs text-white focus:border-brand-red focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editForm.caption}
                    onChange={(e) =>
                      setEditForm({ ...editForm, caption: e.target.value })
                    }
                    placeholder="Caption"
                    className="w-full px-2 py-1 bg-surface border border-gray-700 rounded text-xs text-white focus:border-brand-red focus:outline-none"
                  />
                  <input
                    type="number"
                    value={editForm.galleryOrder}
                    onChange={(e) =>
                      setEditForm({ ...editForm, galleryOrder: Number(e.target.value) })
                    }
                    placeholder="Order (0 = default)"
                    className="w-full px-2 py-1 bg-surface border border-gray-700 rounded text-xs text-white focus:border-brand-red focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-brand-red text-white rounded text-xs hover:bg-brand-red/90"
                    >
                      <Check className="h-3 w-3" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 border border-gray-600 text-gray-300 rounded text-xs hover:bg-surface"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <p className="text-xs text-white truncate">{item.filename}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-[10px] rounded capitalize">
                      {item.category}
                    </span>
                    {item.altText && (
                      <span className="text-[10px] text-gray-500 truncate">
                        {item.altText}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
