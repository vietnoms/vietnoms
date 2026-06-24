"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

export function ResubscribeButton({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );

  async function resubscribe() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-brand-yellow text-sm">
        <Check className="h-4 w-4" />
        <span>Welcome back — you&apos;re resubscribed!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={resubscribe}
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:border-brand-yellow/50 hover:text-brand-yellow disabled:opacity-60 transition-colors"
      >
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        Resubscribe
      </button>
      {status === "error" && (
        <p className="text-xs text-red-400">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
