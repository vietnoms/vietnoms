"use client";

import { useState } from "react";
import { Star, Copy, Check, ExternalLink } from "lucide-react";
import { buildReplyTemplates } from "@/lib/marketing/reply-templates";
import type { GoogleReview } from "@/lib/google-reviews";

export function GoogleReviewCard({ review }: { review: GoogleReview }) {
  const templates = buildReplyTemplates(review);
  const [draft, setDraft] = useState(templates[0]?.text || "");
  const [copied, setCopied] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{review.authorName}</span>
            <span className="text-xs text-gray-500">
              {review.relativeTimeDescription}
            </span>
          </div>
          <div className="mt-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={`h-4 w-4 ${
                  value <= review.rating
                    ? "fill-brand-yellow text-brand-yellow"
                    : "text-gray-700"
                }`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => setComposerOpen(!composerOpen)}
          className="flex-shrink-0 text-sm text-brand-red hover:text-brand-red/80 font-medium transition-colors"
        >
          {composerOpen ? "Hide reply" : "Draft reply"}
        </button>
      </div>

      <p className="mt-3 text-sm text-gray-300 leading-relaxed">{review.text}</p>

      {composerOpen && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.tone}
                onClick={() => setDraft(template.text)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  draft === template.text
                    ? "bg-brand-red/10 text-brand-red"
                    : "bg-surface-alt text-gray-400 hover:text-white"
                }`}
              >
                {template.tone}
              </button>
            ))}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy reply"}
            </button>
            <a
              href="https://business.google.com/reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Open Google Business Profile <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-xs text-gray-500">
            Google doesn&apos;t allow replies via API — copy your reply, then
            paste it on the review in Google Business Profile.
          </p>
        </div>
      )}
    </div>
  );
}
