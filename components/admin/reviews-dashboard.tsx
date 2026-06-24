"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star, Loader2, Check, X, ExternalLink, Inbox } from "lucide-react";
import { GoogleReviewCard } from "./google-review-card";
import { ReviewRequestSettings } from "./review-request-settings";
import type { GoogleReviewsAdminData } from "@/lib/google-reviews";

interface ItemReview {
  id: number;
  squareItemId: string;
  rating: number;
  reviewText: string | null;
  status: string;
  createdAt: string;
  givenName: string | null;
  familyName: string | null;
}

interface ReviewRequest {
  id: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  channel: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  rating: number | null;
  routedTo: string | null;
}

interface PrivateFeedback {
  id: number;
  rating: number | null;
  feedbackText: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  createdAt: string;
}

interface RequestStats {
  sent: number;
  responded: number;
  ratings: Record<number, number>;
}

const REQUEST_STATUS_COLORS: Record<string, string> = {
  queued: "bg-blue-600/20 text-blue-400",
  sent: "bg-yellow-600/20 text-yellow-400",
  responded: "bg-green-600/20 text-green-400",
  failed: "bg-red-600/20 text-red-400",
  cancelled: "bg-gray-600/20 text-gray-400",
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-3.5 w-3.5 ${
            value <= rating
              ? "fill-brand-yellow text-brand-yellow"
              : "text-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

export function ReviewsDashboard({
  google,
  itemNames,
}: {
  google: GoogleReviewsAdminData;
  itemNames: Record<string, string>;
}) {
  const [moderationStatus, setModerationStatus] = useState("pending");
  const [itemReviews, setItemReviews] = useState<ItemReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [feedback, setFeedback] = useState<PrivateFeedback[]>([]);
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const fetchItemReviews = useCallback(async () => {
    setReviewsLoading(true);
    const res = await fetch(`/api/admin/reviews?status=${moderationStatus}`);
    if (res.ok) {
      const data = await res.json();
      setItemReviews(data.reviews);
    }
    setReviewsLoading(false);
  }, [moderationStatus]);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    const res = await fetch("/api/admin/review-requests");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
      setFeedback(data.feedback);
      setStats(data.stats);
    }
    setRequestsLoading(false);
  }, []);

  useEffect(() => {
    fetchItemReviews();
  }, [fetchItemReviews]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const moderate = async (id: number, status: "approved" | "rejected") => {
    await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchItemReviews();
  };

  const markRead = async (feedbackId: number) => {
    await fetch("/api/admin/review-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackId }),
    });
    fetchRequests();
  };

  const responseRate =
    stats && stats.sent > 0
      ? Math.round((stats.responded / stats.sent) * 100)
      : null;
  const unreadFeedback = feedback.filter((f) => f.status === "new").length;

  return (
    <Tabs defaultValue="items">
      <TabsList>
        <TabsTrigger value="items">Dish Reviews</TabsTrigger>
        <TabsTrigger value="google">Google Reviews</TabsTrigger>
        <TabsTrigger value="requests">
          Review Requests
          {unreadFeedback > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-brand-red text-white text-[10px] font-bold">
              {unreadFeedback}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      {/* ---- Dish review moderation ---- */}
      <TabsContent value="items" className="space-y-4 mt-6">
        <div className="flex gap-2">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setModerationStatus(status)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                moderationStatus === status
                  ? "bg-brand-red/10 text-brand-red"
                  : "text-gray-400 hover:text-white hover:bg-surface-alt"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : itemReviews.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No {moderationStatus} reviews</p>
            {moderationStatus === "pending" && (
              <p className="mt-2 text-sm">
                New dish reviews from customers will land here for approval
                before they appear on the menu.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {itemReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-gray-800 bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">
                        {[review.givenName, review.familyName]
                          .filter(Boolean)
                          .join(" ") || "Customer"}
                      </span>
                      <span className="text-xs text-gray-500">on</span>
                      <span className="text-xs text-brand-yellow">
                        {itemNames[review.squareItemId] || review.squareItemId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {review.createdAt?.slice(0, 10)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <Stars rating={review.rating} />
                    </div>
                    {review.reviewText && (
                      <p className="mt-2 text-sm text-gray-300">
                        {review.reviewText}
                      </p>
                    )}
                  </div>
                  {moderationStatus === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => moderate(review.id, "approved")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => moderate(review.id, "rejected")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ---- Google reviews ---- */}
      <TabsContent value="google" className="space-y-4 mt-6">
        {google.rating != null && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface p-4">
            <div className="flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-brand-yellow text-brand-yellow" />
              <span className="text-2xl font-bold text-white">
                {google.rating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-gray-400">
              {google.userRatingCount} reviews on Google
            </span>
            <a
              href="https://business.google.com/reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-sm text-brand-red hover:text-brand-red/80 font-medium transition-colors"
            >
              Manage on Google <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {!google.configured ? (
          <div className="text-center py-16 text-gray-500">
            <p>Google Places API is not configured</p>
            <p className="mt-2 text-sm max-w-md mx-auto">
              Set <code className="text-gray-400">GOOGLE_PLACES_API_KEY</code>{" "}
              (and optionally{" "}
              <code className="text-gray-400">GOOGLE_PLACE_ID</code>) in your
              environment to monitor Google reviews here. The Places API
              returns your most recent reviews; replies must be posted in
              Google Business Profile.
            </p>
          </div>
        ) : google.reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No Google reviews returned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {google.reviews.map((review, index) => (
              <GoogleReviewCard key={index} review={review} />
            ))}
            <p className="text-xs text-gray-500">
              Google&apos;s API returns up to 5 recent reviews. See all reviews
              in Google Business Profile.
            </p>
          </div>
        )}
      </TabsContent>

      {/* ---- Review requests + private feedback ---- */}
      <TabsContent value="requests" className="space-y-6 mt-6">
        {requestsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-800 bg-surface p-4">
                  <p className="text-sm text-gray-400">Requests sent</p>
                  <p className="mt-1 text-3xl font-bold text-white">
                    {stats.sent}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-surface p-4">
                  <p className="text-sm text-gray-400">Response rate</p>
                  <p className="mt-1 text-3xl font-bold text-brand-yellow">
                    {responseRate != null ? `${responseRate}%` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-surface p-4">
                  <p className="text-sm text-gray-400">Ratings received</p>
                  <div className="mt-2 flex items-end gap-1 h-8">
                    {[1, 2, 3, 4, 5].map((rating) => {
                      const count = stats.ratings[rating] || 0;
                      const max = Math.max(...Object.values(stats.ratings), 1);
                      return (
                        <div
                          key={rating}
                          title={`${rating}★: ${count}`}
                          className="flex-1 bg-brand-yellow/60 rounded-sm"
                          style={{ height: `${Math.max((count / max) * 100, 4)}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Private feedback inbox */}
            <div>
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white mb-3">
                <Inbox className="h-5 w-5 text-brand-red" /> Private Feedback
                {unreadFeedback > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-red text-white text-xs font-bold">
                    {unreadFeedback} new
                  </span>
                )}
              </h3>
              {feedback.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  No private feedback yet. Customers who rate 1–3 stars are
                  routed here instead of to public review sites.
                </p>
              ) : (
                <div className="space-y-3">
                  {feedback.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-lg border p-4 ${
                        entry.status === "new"
                          ? "border-brand-red/40 bg-brand-red/5"
                          : "border-gray-800 bg-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {entry.rating != null && <Stars rating={entry.rating} />}
                            <span className="text-sm font-medium text-white">
                              {entry.customerName || "Customer"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {entry.createdAt?.slice(0, 10)}
                            </span>
                          </div>
                          {entry.feedbackText && (
                            <p className="mt-2 text-sm text-gray-300">
                              {entry.feedbackText}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-gray-500">
                            {[entry.customerEmail, entry.customerPhone]
                              .filter(Boolean)
                              .join(" · ") || "No contact info"}
                          </p>
                        </div>
                        {entry.status === "new" && (
                          <button
                            onClick={() => markRead(entry.id)}
                            className="flex-shrink-0 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Request queue */}
            <div>
              <h3 className="font-display text-lg font-bold text-white mb-3">
                Request Queue
              </h3>
              {requests.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  No review requests yet. Enable them in Settings — each paid
                  online order will queue a &quot;How was it?&quot; email or
                  text.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left text-gray-400">
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Channel</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Scheduled</th>
                        <th className="px-3 py-2">Rating</th>
                        <th className="px-3 py-2">Routed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr
                          key={request.id}
                          className="border-b border-gray-800/50 text-gray-300"
                        >
                          <td className="px-3 py-2">
                            <span className="text-white">
                              {request.customerName || "—"}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {request.customerEmail || request.customerPhone}
                            </span>
                          </td>
                          <td className="px-3 py-2 uppercase text-xs">
                            {request.channel}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${REQUEST_STATUS_COLORS[request.status] || "bg-gray-600/20 text-gray-400"}`}
                            >
                              {request.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {request.scheduledAt?.slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="px-3 py-2">
                            {request.rating != null ? (
                              <Stars rating={request.rating} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {request.routedTo || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </TabsContent>

      {/* ---- Settings ---- */}
      <TabsContent value="settings" className="mt-6">
        <ReviewRequestSettings />
      </TabsContent>
    </Tabs>
  );
}
