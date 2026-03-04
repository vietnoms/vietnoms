"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Star, Heart, Loader2 } from "lucide-react";

interface ReviewData {
  id: number;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  givenName: string | null;
  familyName: string | null;
}

interface ItemReviewsProps {
  itemId: string;
  initialStats: {
    averageRating: number;
    reviewCount: number;
    likeCount: number;
  };
}

export function ItemReviews({ itemId, initialStats }: ItemReviewsProps) {
  const { user, setShowLogin } = useAuth();

  const [stats, setStats] = useState(initialStats);
  const [liked, setLiked] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch reviews on mount
  useEffect(() => {
    setLoadingReviews(true);
    fetch(`/api/reviews?itemId=${itemId}`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [itemId]);

  // Check if user has liked this item
  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    fetch("/api/likes/mine")
      .then((r) => r.json())
      .then((data) => {
        const likedIds: string[] = data.likedItemIds || [];
        setLiked(likedIds.includes(itemId));
      })
      .catch(() => {});
  }, [user, itemId]);

  async function handleLike() {
    if (!user) {
      setShowLogin(true);
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setStats((s) => ({
      ...s,
      likeCount: s.likeCount + (wasLiked ? -1 : 1),
    }));
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        setLiked(wasLiked);
        setStats((s) => ({
          ...s,
          likeCount: s.likeCount + (wasLiked ? 1 : -1),
        }));
      }
    } catch {
      setLiked(wasLiked);
      setStats((s) => ({
        ...s,
        likeCount: s.likeCount + (wasLiked ? 1 : -1),
      }));
    }
  }

  async function handleSubmitReview() {
    if (!user) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          rating: reviewRating,
          reviewText: reviewText || undefined,
        }),
      });
      if (res.ok) {
        setShowReviewForm(false);
        setReviewText("");
        setReviewRating(5);
        // Refresh reviews
        const r = await fetch(`/api/reviews?itemId=${itemId}`);
        const data = await r.json();
        setReviews(data.reviews || []);
        // Update stats optimistically
        setStats((s) => ({
          ...s,
          reviewCount: s.reviewCount + 1,
          averageRating:
            (s.averageRating * s.reviewCount + reviewRating) /
            (s.reviewCount + 1),
        }));
      }
    } catch {
      // ignore
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center gap-4">
        {stats.reviewCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(stats.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="font-medium ml-1">
              {stats.averageRating.toFixed(1)}
            </span>
            <span className="text-gray-400">
              ({stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}
        <button
          onClick={handleLike}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-500 transition-colors"
        >
          <Heart
            className={`h-4 w-4 ${
              liked ? "fill-red-500 text-red-500" : ""
            }`}
          />
          <span>{stats.likeCount}</span>
        </button>
      </div>

      {/* Reviews list */}
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Reviews</h3>
        {loadingReviews ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-gray-400">
            No reviews yet. Be the first to review!
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-500">
                    {review.givenName || "Customer"}
                  </span>
                </div>
                {review.reviewText && (
                  <p className="text-gray-600 mt-1">{review.reviewText}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Write a review */}
        {user && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="text-sm text-brand-red hover:underline mt-2"
          >
            Write a Review
          </button>
        )}
        {!user && (
          <button
            onClick={() => setShowLogin(true)}
            className="text-sm text-brand-red hover:underline mt-2"
          >
            Sign in to write a review
          </button>
        )}

        {showReviewForm && (
          <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReviewRating(i + 1)}
                  aria-label={`Rate ${i + 1} star${i > 0 ? "s" : ""}`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      i < reviewRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="What did you think? (optional)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                Submit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReviewForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
