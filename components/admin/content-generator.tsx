"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check } from "lucide-react";

const CONTENT_TYPES = [
  { value: "blog", label: "Blog Post (1200-1500w)" },
  { value: "meta", label: "Meta Tags Package" },
  { value: "recipe", label: "Recipe Post" },
  { value: "gmb", label: "GMB Posts (x5)" },
  { value: "faq", label: "FAQ Schema Content" },
  { value: "local", label: "Local SEO Post" },
];

const CONTENT_CLUSTERS: Record<
  string,
  { pillar: string; spokes: string[]; keywords: string[]; published?: boolean }
> = {
  "Pho & Soups": {
    pillar: "Ultimate Guide to Vietnamese Pho",
    published: true,
    spokes: [
      "Pho Bo vs Pho Ga: Complete Comparison",
      "How to Eat Pho Like a Local",
      "The History of Pho: From Hanoi to America",
      "Best Pho Toppings and Condiments Guide",
      "Bun Bo Hue: Vietnam's Spicy Soup Masterpiece",
      "Vietnamese Soup Varieties Beyond Pho",
    ],
    keywords: [
      "pho near me",
      "vietnamese pho",
      "best pho",
      "pho recipe",
      "pho broth",
      "bun bo hue",
    ],
  },
  "Banh Mi & Sandwiches": {
    pillar: "The Complete Guide to Banh Mi",
    published: true,
    spokes: [
      "Banh Mi Ingredients: What Makes It Perfect",
      "Types of Banh Mi You Need to Try",
      "Banh Mi vs Subway: Why Vietnamese Sandwiches Win",
      "The French-Vietnamese History of Banh Mi",
      "How to Order Banh Mi Like a Pro",
    ],
    keywords: [
      "banh mi near me",
      "vietnamese sandwich",
      "best banh mi",
      "banh mi recipe",
    ],
  },
  "Vietnamese Coffee": {
    pillar: "Vietnamese Coffee: The Complete Guide",
    published: true,
    spokes: [
      "Ca Phe Sua Da: The Perfect Iced Coffee",
      "Egg Coffee: Hanoi's Creamy Creation",
      "Vietnamese Coffee vs Regular Coffee",
      "How to Brew Vietnamese Coffee at Home",
      "Why Vietnamese Coffee Is So Strong",
    ],
    keywords: [
      "vietnamese coffee",
      "ca phe sua da",
      "egg coffee",
      "vietnamese iced coffee",
    ],
  },
  "Vietnamese Cuisine 101": {
    pillar: "Vietnamese Food: A Complete Beginner's Guide",
    published: true,
    spokes: [
      "Top 10 Vietnamese Dishes Everyone Should Try",
      "Vietnamese Food vs Chinese Food: Key Differences",
      "Vietnamese Herbs and Condiments Guide",
      "How to Use Chopsticks: Quick Guide",
      "Vietnamese Street Food: What to Know",
      "Vegetarian Vietnamese Food Options",
    ],
    keywords: [
      "vietnamese food",
      "vietnamese cuisine",
      "vietnamese dishes",
      "vietnamese food near me",
    ],
  },
  "Local SEO Content": {
    pillar: "Best Vietnamese Food in San Jose",
    published: false,
    spokes: [
      "Vietnamese Restaurants Near Downtown San Jose",
      "Where to Get Pho in San Jose",
      "Best Lunch Spots in SoFA District",
      "Vietnamese Catering in the Bay Area",
      "San Jose Food Scene: Vietnamese Edition",
    ],
    keywords: [
      "vietnamese food san jose",
      "pho near me san jose",
      "best vietnamese restaurant san jose",
    ],
  },
};

export function ContentGenerator() {
  const [contentType, setContentType] = useState("blog");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [city, setCity] = useState("San Jose, CA");
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!topic.trim()) {
      setError("Enter a topic first");
      return;
    }
    setGenerating(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/admin/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, topic, keywords, city }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }
      setResult(data.content);
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectTopic = (t: string, kws: string[]) => {
    setTopic(t);
    setKeywords(kws.join(", "));
  };

  return (
    <div className="space-y-8">
      {/* Generator Form */}
      <Card className="border-gray-800 bg-surface">
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400">Content Type</Label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-700 bg-surface-alt px-3 py-2 text-sm text-white focus:border-brand-red focus:outline-none"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-400">City</Label>
              <Input
                className="mt-1"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. San Jose, CA"
              />
            </div>
          </div>
          <div>
            <Label className="text-gray-400">Topic / Title</Label>
            <Input
              className="mt-1"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. The History of Pho: From Hanoi Street Stalls to America"
            />
          </div>
          <div>
            <Label className="text-gray-400">
              Target Keywords (comma-separated)
            </Label>
            <Input
              className="mt-1"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. pho history, vietnamese pho, what is pho"
            />
          </div>
          <Button onClick={generate} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Content"
            )}
          </Button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-gray-800 bg-surface">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Generated Content
              </h3>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-mono bg-black/30 rounded-lg p-4 max-h-[600px] overflow-auto">
              {result}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Topic Bank */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Topic Bank — Click to use
        </h2>
        <div className="space-y-4">
          {Object.entries(CONTENT_CLUSTERS).map(([cluster, data]) => (
            <Card key={cluster} className="border-gray-800 bg-surface">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-brand-red font-semibold">{cluster}</span>
                  {data.published ? (
                    <Badge className="bg-green-600/20 text-green-400 border-green-800 text-xs">
                      Pillar Published
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-600/20 text-amber-400 border-amber-800 text-xs">
                      Pillar Needed
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => selectTopic(data.pillar, data.keywords)}
                  className="text-sm font-medium text-white hover:text-brand-red transition-colors cursor-pointer mb-2 block"
                >
                  Pillar: {data.pillar}
                </button>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {data.spokes.map((spoke) => (
                    <button
                      key={spoke}
                      onClick={() => selectTopic(spoke, data.keywords)}
                      className="text-xs text-gray-400 bg-black/30 px-2.5 py-1 rounded-full border border-gray-800 hover:border-brand-red hover:text-white transition-colors cursor-pointer"
                    >
                      {spoke}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs text-green-500/70 font-mono bg-green-900/10 px-2 py-0.5 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
