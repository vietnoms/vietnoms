"use client";

import { useState } from "react";
import { Star, Loader2, Check, ExternalLink } from "lucide-react";

interface FeedbackFlowProps {
  token: string;
  customerName: string | null;
  googleReviewUrl: string;
  yelpReviewUrl: string;
}

export function FeedbackFlow({
  token,
  customerName,
  googleReviewUrl,
  yelpReviewUrl,
}: FeedbackFlowProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [step, setStep] = useState<"rate" | "public" | "private" | "done">(
    "rate"
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submitRating(value: number) {
    setRating(value);
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStep(data.routedTo === "public" ? "public" : "private");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPrivateFeedback(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, feedbackText }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "rate") {
    return (
      <div className="text-center">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white">
          How was your order{customerName ? `, ${customerName}` : ""}?
        </h1>
        <p className="mt-4 text-gray-400">
          Tap a star — it takes 30 seconds and goes straight to the owners.
        </p>
        <div className="mt-10 flex justify-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              disabled={submitting}
              onClick={() => submitRating(value)}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Star
                className={`h-12 w-12 sm:h-14 sm:w-14 transition-colors ${
                  value <= (hovered || rating)
                    ? "fill-brand-yellow text-brand-yellow"
                    : "text-gray-600"
                }`}
              />
            </button>
          ))}
        </div>
        {submitting && (
          <Loader2 className="mt-8 h-6 w-6 animate-spin text-gray-500 mx-auto" />
        )}
        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  if (step === "public") {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-brand-yellow/10 flex items-center justify-center">
          <Check className="h-8 w-8 text-brand-yellow" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold text-white">
          That means a lot!
        </h1>
        <p className="mt-4 text-gray-400 max-w-md mx-auto">
          Would you share your experience publicly? It&apos;s the single best
          way to help a small restaurant like ours.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors"
          >
            Review us on Google <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={yelpReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-brand-yellow/50 hover:text-brand-yellow transition-colors"
          >
            Review on Yelp <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  if (step === "private") {
    return (
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-white">
          We&apos;re sorry we missed the mark.
        </h1>
        <p className="mt-4 text-gray-400 max-w-md mx-auto">
          Tell us what went wrong — this goes directly to the owners, not to a
          public site, and we read every word.
        </p>
        <form onSubmit={submitPrivateFeedback} className="mt-8 max-w-md mx-auto text-left space-y-3">
          <label htmlFor="feedback-text" className="sr-only">
            What went wrong?
          </label>
          <textarea
            id="feedback-text"
            required
            rows={5}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What happened? What could we have done better?"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
          />
          <button
            type="submit"
            disabled={submitting || !feedbackText.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send to the owners
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-brand-yellow/10 flex items-center justify-center">
        <Check className="h-8 w-8 text-brand-yellow" />
      </div>
      <h1 className="mt-6 font-display text-4xl font-bold text-white">
        Thank you.
      </h1>
      <p className="mt-4 text-gray-400 max-w-md mx-auto">
        Your feedback went straight to the owners. If you left contact info
        with your order, we may reach out to make things right.
      </p>
    </div>
  );
}
