"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

interface EmailSignupFormProps {
  source: "footer" | "popup" | "rewards";
  /** Compact renders a single-row input+button (footer); full adds a name field. */
  variant?: "compact" | "full";
  buttonLabel?: string;
  onSuccess?: () => void;
}

export function EmailSignupForm({
  source,
  variant = "compact",
  buttonLabel = "Sign Up",
  onSuccess,
}: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      onSuccess?.();
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-brand-yellow text-sm py-2">
        <Check className="h-4 w-4 flex-shrink-0" />
        <span>You&apos;re on the list! Check your inbox.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {variant === "full" && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name (optional)"
          autoComplete="given-name"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
        />
      )}
      <div className="flex gap-2">
        <label htmlFor={`signup-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`signup-email-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            buttonLabel
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-gray-500">
        No spam — just specials, new dishes, and events. Unsubscribe anytime.
      </p>
    </form>
  );
}
