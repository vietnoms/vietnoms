"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Star } from "lucide-react";

export function LoyaltyBadge() {
  const { user } = useAuth();
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setPoints(null);
      return;
    }

    fetch("/api/loyalty")
      .then((r) => r.json())
      .then((data) => {
        if (data.account?.balance != null) {
          setPoints(data.account.balance);
        }
      })
      .catch(() => {});
  }, [user]);

  if (!user || points === null) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 text-xs font-medium">
      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
      {points} pts
    </span>
  );
}
