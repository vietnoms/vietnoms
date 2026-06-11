"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Star, Loader2, ArrowRight } from "lucide-react";

interface RewardTier {
  id: string;
  name: string;
  points: number;
}

interface LoyaltyData {
  program: {
    id: string;
    rewardTiers: RewardTier[];
    terminologyOne: string;
    terminologyOther: string;
  } | null;
  account: {
    balance: number;
    lifetimePoints: number;
  } | null;
}

export function RewardsPanel() {
  const { user, loading: authLoading, setShowLogin } = useAuth();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch("/api/loyalty")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  // Logged out — signup CTA (the OTP login auto-creates an account)
  if (!user) {
    return (
      <div className="rounded-2xl border border-brand-yellow/20 bg-gradient-to-br from-[#1a1a14] to-[#141414] p-8 text-center">
        <Star className="h-10 w-10 mx-auto fill-brand-yellow text-brand-yellow" />
        <h3 className="mt-4 font-display text-2xl font-bold text-white">
          Check your points
        </h3>
        <p className="mt-2 text-sm text-gray-400 max-w-sm mx-auto">
          Sign in with your phone number — if you&apos;re new, that&apos;s all
          it takes to join. You start earning on your very first order.
        </p>
        <button
          onClick={() => setShowLogin(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors"
        >
          Sign In / Join Free
        </button>
      </div>
    );
  }

  const balance = data?.account?.balance ?? 0;
  const lifetime = data?.account?.lifetimePoints ?? 0;
  const tiers = (data?.program?.rewardTiers ?? []).slice().sort((a, b) => a.points - b.points);
  const nextTier = tiers.find((tier) => tier.points > balance);
  const reachedTiers = tiers.filter((tier) => tier.points <= balance);
  const unit = data?.program?.terminologyOther || "points";
  const progress = nextTier ? Math.min((balance / nextTier.points) * 100, 100) : 100;

  return (
    <div className="rounded-2xl border border-brand-yellow/20 bg-gradient-to-br from-[#1a1a14] to-[#141414] p-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-400">Your balance</p>
          <p className="font-display text-5xl font-bold text-brand-yellow">
            {balance}{" "}
            <span className="text-lg text-gray-400 font-normal">{unit}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {lifetime} lifetime {unit}
          </p>
        </div>
        {reachedTiers.length > 0 && (
          <div className="rounded-lg bg-brand-yellow/10 px-4 py-3">
            <p className="text-xs text-brand-yellow font-semibold uppercase tracking-wide">
              Reward available!
            </p>
            <p className="mt-1 text-sm text-white">
              {reachedTiers[reachedTiers.length - 1].name}
            </p>
          </div>
        )}
      </div>

      {nextTier && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>
              {nextTier.points - balance} {unit} to: {nextTier.name}
            </span>
            <span>
              {balance}/{nextTier.points}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-red to-brand-yellow transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Link
        href="/order"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:text-brand-yellow transition-colors"
      >
        {reachedTiers.length > 0
          ? "Redeem at checkout"
          : "Earn points — order now"}{" "}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
