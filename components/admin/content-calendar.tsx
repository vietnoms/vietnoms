"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WEEKLY_SCHEDULE = [
  {
    day: "Monday",
    type: "Blog Post",
    desc: "Publish a spoke or pillar article from a content cluster",
  },
  {
    day: "Tuesday",
    type: "GMB Post",
    desc: "Promotional or educational Google My Business post",
  },
  {
    day: "Wednesday",
    type: "Recipe / How-to",
    desc: "Recipe post with schema markup for rich snippets",
  },
  {
    day: "Thursday",
    type: "Local Content",
    desc: "City-specific or neighborhood-focused post",
  },
  {
    day: "Friday",
    type: "Social → Blog",
    desc: "Repurpose social content into a short blog or listicle",
  },
  {
    day: "Saturday",
    type: "Photo Post",
    desc: "Behind-the-scenes, dish photos, or team spotlight on GMB",
  },
  {
    day: "Sunday",
    type: "Review / UGC",
    desc: "Share a customer review, respond to reviews, request reviews",
  },
];

const TYPE_COLORS: Record<string, string> = {
  "Blog Post": "bg-brand-red/20 text-brand-red border-brand-red/30",
  "GMB Post": "bg-blue-600/20 text-blue-400 border-blue-800",
  "Recipe / How-to": "bg-amber-600/20 text-amber-400 border-amber-800",
  "Local Content": "bg-green-600/20 text-green-400 border-green-800",
  "Social → Blog": "bg-purple-600/20 text-purple-400 border-purple-800",
  "Photo Post": "bg-pink-600/20 text-pink-400 border-pink-800",
  "Review / UGC": "bg-cyan-600/20 text-cyan-400 border-cyan-800",
};

const CLUSTER_PROGRESS = [
  { name: "Pho & Soups", pillar: true, spokes: 0, total: 6 },
  { name: "Banh Mi & Sandwiches", pillar: true, spokes: 0, total: 5 },
  { name: "Vietnamese Coffee", pillar: true, spokes: 0, total: 5 },
  { name: "Vietnamese Cuisine 101", pillar: true, spokes: 0, total: 6 },
  { name: "Local SEO Content", pillar: false, spokes: 0, total: 5 },
];

export function ContentCalendar() {
  return (
    <div className="space-y-10">
      {/* Weekly Schedule */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Weekly Publishing Schedule
        </h2>
        <div className="space-y-2">
          {WEEKLY_SCHEDULE.map((s) => (
            <Card key={s.day} className="border-gray-800 bg-surface">
              <CardContent className="px-4 py-3 grid grid-cols-[100px_1fr] sm:grid-cols-[100px_180px_1fr] gap-4 items-center">
                <span className="text-sm font-semibold text-white">
                  {s.day}
                </span>
                <Badge
                  className={`justify-center text-xs w-fit ${
                    TYPE_COLORS[s.type] || "bg-gray-800 text-gray-400"
                  }`}
                >
                  {s.type}
                </Badge>
                <span className="text-sm text-gray-400 hidden sm:block">
                  {s.desc}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Topic Cluster Progress */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Topic Cluster Progress
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CLUSTER_PROGRESS.map((c) => (
            <Card key={c.name} className="border-gray-800 bg-surface">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-white mb-2">
                  {c.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">Pillar:</span>
                  {c.pillar ? (
                    <Badge className="bg-green-600/20 text-green-400 border-green-800 text-xs">
                      Published
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-600/20 text-amber-400 border-amber-800 text-xs">
                      Not Started
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Spokes:</span>
                  <span className="text-xs text-white font-mono">
                    {c.spokes}/{c.total}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-red rounded-full"
                    style={{
                      width: `${((c.spokes + (c.pillar ? 1 : 0)) / (c.total + 1)) * 100}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Strategy Guide */}
      <Card className="border-gray-800 bg-surface">
        <CardContent className="p-6">
          <h2 className="text-brand-red font-semibold text-sm uppercase tracking-wider mb-4">
            Topic Cluster Strategy
          </h2>
          <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
            <p>
              <strong className="text-white">Month 1-2:</strong> Publish all 5
              pillar articles. These are your cornerstone content — long-form,
              comprehensive guides (2000+ words) that target your highest-volume
              keywords.
            </p>
            <p>
              <strong className="text-white">Month 2-4:</strong> Publish spoke
              articles (2-3/week), each linking back to its pillar. This builds
              topical authority and internal link structure Google rewards.
            </p>
            <p>
              <strong className="text-white">Month 4-6:</strong> Layer in local
              content (city-specific posts, event tie-ins, neighborhood guides).
              Update pillar content with new internal links.
            </p>
            <p>
              <strong className="text-white">Ongoing:</strong> 1 blog + 2 GMB
              posts + 1 recipe per week minimum. Refresh old content quarterly.
              Respond to every Google review.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
