"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatGan(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})(?=.)/g, "$1 ");
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function GiftCardBalance() {
  const [gan, setGan] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ balance: number; state: string } | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    const digits = gan.replace(/\D/g, "");
    if (digits.length !== 16) {
      setError("Please enter a 16-digit gift card number.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/gift-cards/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gan: digits }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to check balance.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="balance" className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-gray-400" />
        <h2 className="font-display text-xl font-bold text-gray-900">Check Your Balance</h2>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={gan}
          onChange={(e) => {
            setGan(formatGan(e.target.value));
            setResult(null);
            setError("");
          }}
          placeholder="XXXX XXXX XXXX XXXX"
          maxLength={19}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-center font-mono tracking-wider text-lg text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
        <Button onClick={handleCheck} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className="text-3xl font-bold text-green-700 mt-1">
            {formatMoney(result.balance)}
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            Card Status: {result.state?.toLowerCase().replace("_", " ")}
          </p>
        </div>
      )}
    </div>
  );
}
