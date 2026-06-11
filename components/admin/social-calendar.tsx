"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Send,
  Pencil,
  Trash2,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  SocialComposer,
  emptyComposer,
  type ComposerInitial,
  type ComposerMenuItem,
  type ComposerMediaItem,
} from "./social-composer";
import { ContentCalendar } from "./content-calendar";

interface SocialPost {
  id: number;
  title: string | null;
  body: string;
  mediaUrl: string | null;
  menuItemId: string | null;
  menuItemName: string | null;
  platforms: string[];
  scheduledAt: string;
  status: string;
  publishedAt: string | null;
  errorMessage: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-600/20 text-gray-400",
  scheduled: "bg-blue-600/20 text-blue-400",
  ready: "bg-amber-600/20 text-amber-400",
  published: "bg-green-600/20 text-green-400",
  failed: "bg-red-600/20 text-red-400",
  cancelled: "bg-gray-600/20 text-gray-500",
};

function toComposerInitial(post: SocialPost): ComposerInitial {
  const date = new Date(post.scheduledAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    id: post.id,
    title: post.title || "",
    body: post.body,
    mediaUrl: post.mediaUrl || "",
    menuItemId: post.menuItemId || "",
    platforms: post.platforms,
    scheduledAt: Number.isNaN(date.getTime())
      ? ""
      : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function SocialCalendar({
  menuItems,
  media,
}: {
  menuItems: ComposerMenuItem[];
  media: ComposerMediaItem[];
}) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [facebookConfigured, setFacebookConfigured] = useState(false);
  const [instagramConfigured, setInstagramConfigured] = useState(false);
  const [composer, setComposer] = useState<ComposerInitial | null>(null);
  const [monthStart, setMonthStart] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/social-posts");
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
      setFacebookConfigured(data.meta.facebookConfigured);
      setInstagramConfigured(data.meta.instagramConfigured);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const copyCaption = async (post: SocialPost) => {
    try {
      await navigator.clipboard.writeText(post.body);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const publishNow = async (post: SocialPost) => {
    setPublishingId(post.id);
    await fetch(`/api/admin/social-posts/${post.id}/publish`, {
      method: "POST",
    });
    setPublishingId(null);
    fetchPosts();
  };

  const markPublished = async (post: SocialPost) => {
    await fetch(`/api/admin/social-posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    fetchPosts();
  };

  const remove = async (post: SocialPost) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/admin/social-posts/${post.id}`, { method: "DELETE" });
    fetchPosts();
  };

  // --- Month grid ---
  const monthLabel = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate();
  const firstWeekday = monthStart.getDay();

  const postsByDay = new Map<number, SocialPost[]>();
  for (const post of posts) {
    const date = new Date(post.scheduledAt);
    if (
      date.getFullYear() === monthStart.getFullYear() &&
      date.getMonth() === monthStart.getMonth()
    ) {
      const day = date.getDate();
      postsByDay.set(day, [...(postsByDay.get(day) || []), post]);
    }
  }

  const readyPosts = posts.filter((post) => post.status === "ready");
  const manualMode = !facebookConfigured;

  return (
    <div className="space-y-6">
      {manualMode && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-700/40 bg-amber-900/20 p-4 text-sm text-amber-300">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Manual mode:</strong> Facebook/Instagram API keys aren&apos;t
            configured, so scheduled posts become &quot;Ready&quot; at their
            scheduled time instead of auto-publishing — copy the caption and
            post by hand. To enable auto-posting, set{" "}
            <code>META_PAGE_ID</code>, <code>META_PAGE_ACCESS_TOKEN</code> (and{" "}
            <code>META_IG_USER_ID</code> for Instagram). See OWNER-GUIDE.md.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setMonthStart(
                new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
              )
            }
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-surface-alt transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-xl font-bold text-white w-44 text-center">
            {monthLabel}
          </h2>
          <button
            onClick={() =>
              setMonthStart(
                new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
              )
            }
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-surface-alt transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setComposer(emptyComposer())}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {composer && (
        <SocialComposer
          initial={composer}
          menuItems={menuItems}
          media={media}
          facebookConfigured={facebookConfigured}
          instagramConfigured={instagramConfigured}
          onClose={() => setComposer(null)}
          onSaved={() => {
            setComposer(null);
            fetchPosts();
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-1 font-medium">
                {day}
              </div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`pad-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dayPosts = postsByDay.get(day) || [];
              const isToday =
                new Date().toDateString() ===
                new Date(
                  monthStart.getFullYear(),
                  monthStart.getMonth(),
                  day
                ).toDateString();
              return (
                <div
                  key={day}
                  className={`min-h-16 rounded-md border p-1 text-left ${
                    isToday
                      ? "border-brand-red/50 bg-brand-red/5"
                      : "border-gray-800 bg-surface"
                  }`}
                >
                  <span className="text-[10px] text-gray-500">{day}</span>
                  <div className="space-y-0.5">
                    {dayPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setComposer(toComposerInitial(post))}
                        title={post.title || post.body.slice(0, 80)}
                        className={`block w-full truncate rounded px-1 py-0.5 text-[10px] text-left ${STATUS_COLORS[post.status]}`}
                      >
                        {post.title || post.menuItemName || post.body.slice(0, 20)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ready (manual) queue */}
          {readyPosts.length > 0 && (
            <div>
              <h3 className="font-display text-lg font-bold text-white mb-3">
                Ready to Post Manually
              </h3>
              <div className="space-y-3">
                {readyPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-amber-700/40 bg-surface p-4"
                  >
                    <div className="flex items-start gap-4">
                      {post.mediaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.mediaUrl}
                          alt=""
                          className="h-16 w-16 rounded-md object-cover border border-gray-700 flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-300 whitespace-pre-line line-clamp-3">
                          {post.body}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => copyCaption(post)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
                          >
                            {copiedId === post.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            Copy caption
                          </button>
                          {post.mediaUrl && (
                            <a
                              href={post.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-md text-xs text-gray-300 border border-gray-700 hover:border-gray-500 transition-colors"
                            >
                              Open image
                            </a>
                          )}
                          <button
                            onClick={() => markPublished(post)}
                            className="px-3 py-1.5 rounded-md text-xs text-green-400 border border-green-800 hover:bg-green-900/20 transition-colors"
                          >
                            Mark as posted
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All posts */}
          <div>
            <h3 className="font-display text-lg font-bold text-white mb-3">
              All Posts
            </h3>
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No posts yet</p>
                <p className="mt-2 text-sm">
                  Create your first post — pick a menu item and let the draft
                  generator write the caption.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface p-3"
                  >
                    {post.mediaUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.mediaUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover border border-gray-700 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">
                          {post.title || post.menuItemName || post.body.slice(0, 40)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status]}`}
                        >
                          {post.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {post.platforms.join(" + ")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {post.scheduledAt.slice(0, 16).replace("T", " ")}
                        {post.errorMessage && (
                          <span className="text-red-400 ml-2">
                            {post.errorMessage}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {["scheduled", "ready", "failed", "draft"].includes(
                        post.status
                      ) &&
                        facebookConfigured && (
                          <button
                            onClick={() => publishNow(post)}
                            disabled={publishingId === post.id}
                            title="Publish now"
                            className="p-1.5 text-gray-400 hover:text-brand-yellow disabled:opacity-50 transition-colors"
                          >
                            {publishingId === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      <button
                        onClick={() => copyCaption(post)}
                        title="Copy caption"
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                      >
                        {copiedId === post.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setComposer(toComposerInitial(post))}
                        title="Edit"
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(post)}
                        title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* SEO content strategy (the previous static calendar) */}
      <div className="border-t border-gray-800 pt-6">
        <button
          onClick={() => setStrategyOpen(!strategyOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${strategyOpen ? "rotate-180" : ""}`}
          />
          SEO Content Strategy Guide
        </button>
        {strategyOpen && (
          <div className="mt-4">
            <ContentCalendar />
          </div>
        )}
      </div>
    </div>
  );
}
