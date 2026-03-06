"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ChecklistItem {
  id: number;
  category: string;
  task: string;
  impact: string;
  done: boolean;
}

const IMPACT_COLORS: Record<string, string> = {
  Critical: "text-red-400",
  High: "text-amber-400",
  Medium: "text-green-400",
};

export function SeoChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecklist = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo-checklist");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleItem = async (item: ChecklistItem) => {
    const newDone = !item.done;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: newDone } : i))
    );

    try {
      await fetch("/api/admin/seo-checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, done: newDone }),
      });
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, done: !newDone } : i))
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const totalDone = items.filter((i) => i.done).length;
  const totalItems = items.length;
  const progress = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">
            {totalDone}/{totalItems} tasks complete
          </span>
          <span className="text-white font-semibold">{progress}%</span>
        </div>
        <div className="h-3 bg-surface-alt rounded-full overflow-hidden border border-gray-800">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-red to-brand-yellow"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const catItems = items.filter((i) => i.category === category);
        const catDone = catItems.filter((i) => i.done).length;

        return (
          <div key={category}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category} — {catDone}/{catItems.length}
            </h3>
            <div className="space-y-1">
              {catItems.map((item) => (
                <Card
                  key={item.id}
                  className={`border cursor-pointer transition-colors ${
                    item.done
                      ? "border-green-900/50 bg-green-950/20"
                      : "border-gray-800 bg-surface hover:border-gray-700"
                  }`}
                  onClick={() => toggleItem(item)}
                >
                  <CardContent className="px-4 py-3 flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center text-xs ${
                        item.done
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-600"
                      }`}
                    >
                      {item.done && "✓"}
                    </div>
                    <span
                      className={`flex-1 text-sm ${
                        item.done
                          ? "line-through text-gray-500"
                          : "text-white"
                      }`}
                    >
                      {item.task}
                    </span>
                    <span
                      className={`text-xs font-mono uppercase tracking-wider ${
                        IMPACT_COLORS[item.impact] || "text-gray-500"
                      }`}
                    >
                      {item.impact}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
