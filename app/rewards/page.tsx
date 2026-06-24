import type { Metadata } from "next";
import { Star, Smartphone, UtensilsCrossed, Gift } from "lucide-react";
import { getLoyaltyProgram } from "@/lib/loyalty";
import { getMarketingSettings } from "@/lib/marketing/settings";
import { RewardsPanel } from "@/components/rewards/rewards-panel";
import { EmailSignupForm } from "@/components/marketing/email-signup-form";
import { BreadcrumbSchema } from "@/components/schema-markup";

export const metadata: Metadata = {
  title: "Vietnoms Rewards | Earn Points on Every Order",
  description:
    "Join Vietnoms Rewards free with just your phone number. Earn points on every order and redeem them for free food.",
};

export const revalidate = 3600;

const HOW_IT_WORKS = [
  {
    icon: Smartphone,
    title: "Join with your phone number",
    text: "No app, no card. Sign in once with your number and you're a member.",
  },
  {
    icon: UtensilsCrossed,
    title: "Earn on every order",
    text: "Points add up automatically every time you order online or pay in store with the same number.",
  },
  {
    icon: Gift,
    title: "Redeem for free food",
    text: "Cash in your points at checkout for rewards. Simple as that.",
  },
];

export default async function RewardsPage() {
  const [program, settings] = await Promise.all([
    getLoyaltyProgram(),
    getMarketingSettings(),
  ]);

  const tiers = (program?.rewardTiers ?? [])
    .slice()
    .sort((a, b) => a.points - b.points);
  const unit = program?.terminologyOther || "points";
  const showTerms = !settings.loyaltyTerms.startsWith("[FILL IN");

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Rewards", url: "/rewards" },
        ]}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="max-w-2xl">
            <p className="font-display text-brand-red tracking-[0.3em] text-sm">
              FREE TO JOIN
            </p>
            <h1 className="mt-2 font-display text-5xl md:text-6xl font-bold text-white">
              Vietnoms <span className="text-brand-yellow">Rewards</span>
            </h1>
            <p className="mt-4 text-gray-400 text-lg">
              Eat the food you already love, earn points every time, trade
              them for free food. That&apos;s the whole program.
            </p>
          </div>

          {/* Member panel / signup */}
          <div className="mt-10 max-w-2xl">
            <RewardsPanel />
          </div>

          {/* How it works */}
          <div className="mt-20">
            <h2 className="font-display text-3xl font-bold text-white">
              How it works
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-white/10 bg-[#141414] p-6"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10 text-brand-red font-display text-lg font-bold">
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 text-brand-yellow" />
                    </div>
                    <h3 className="mt-4 font-display text-xl font-bold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reward tiers */}
          {tiers.length > 0 ? (
            <div className="mt-20">
              <h2 className="font-display text-3xl font-bold text-white">
                Rewards you can earn
              </h2>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#141414] p-5 hover:border-brand-yellow/40 transition-colors"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-yellow/10">
                      <Star className="h-5 w-5 fill-brand-yellow text-brand-yellow" />
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-white">
                        {tier.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {tier.points} {unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-20 rounded-2xl border border-white/10 bg-[#141414] p-10 text-center">
              <h2 className="font-display text-2xl font-bold text-white">
                Rewards launching soon
              </h2>
              <p className="mt-3 text-gray-400 max-w-md mx-auto">
                We&apos;re putting the finishing touches on the program. Leave
                your email and you&apos;ll be first in line.
              </p>
              <div className="mt-6 max-w-md mx-auto text-left">
                <EmailSignupForm source="rewards" buttonLabel="Notify Me" />
              </div>
            </div>
          )}

          {/* Email capture */}
          {tiers.length > 0 && (
            <div className="mt-20 rounded-2xl border border-white/10 bg-[#141414] p-8">
              <h2 className="font-display text-xl font-bold text-white">
                Get member-only offers
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Rewards members on the Noms List get first dibs on specials and
                occasional bonus-point days.
              </p>
              <div className="mt-4 max-w-md">
                <EmailSignupForm source="rewards" buttonLabel="Join" />
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="mt-16 text-xs text-gray-600 max-w-2xl">
            <h3 className="font-semibold text-gray-500 uppercase tracking-wide">
              Program terms
            </h3>
            <p className="mt-2 leading-relaxed">
              {showTerms
                ? settings.loyaltyTerms
                : "Points are earned on qualifying purchases and have no cash value. Rewards subject to availability. Vietnoms may modify or end the program at any time."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
