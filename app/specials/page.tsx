import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, CalendarDays } from "lucide-react";
import { getActiveAndUpcomingSpecials } from "@/lib/db/announcements";
import { EmailSignupForm } from "@/components/marketing/email-signup-form";
import { BreadcrumbSchema } from "@/components/schema-markup";

export const metadata: Metadata = {
  title: "Specials & Limited-Time Offers",
  description:
    "Current specials, limited-time dishes, and events at Vietnoms in San Jose. Check back often — these don't last.",
};

export const revalidate = 300;

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function SpecialsPage() {
  const { active, upcoming } = await getActiveAndUpcomingSpecials();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Specials", url: "/specials" },
        ]}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-display text-brand-red tracking-[0.3em] text-sm">
            LIMITED TIME
          </p>
          <h1 className="mt-2 font-display text-5xl md:text-6xl font-bold text-white">
            Specials
          </h1>
          <p className="mt-4 text-gray-400 max-w-2xl">
            Limited-time dishes, deals, and events. When they&apos;re gone,
            they&apos;re gone.
          </p>

          {active.length === 0 && upcoming.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-white/10 bg-[#141414] p-10 text-center">
              <h2 className="font-display text-2xl font-bold text-white">
                Nothing running right now
              </h2>
              <p className="mt-3 text-gray-400 max-w-md mx-auto">
                New specials drop regularly. Join the Noms List and you&apos;ll
                be the first to know.
              </p>
              <div className="mt-6 max-w-md mx-auto text-left">
                <EmailSignupForm source="footer" buttonLabel="Notify Me" />
              </div>
            </div>
          ) : (
            <>
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {active.map((special) => {
                  const ends = formatDate(special.endsAt);
                  return (
                    <div
                      key={special.id}
                      className="group rounded-2xl border border-white/10 bg-[#141414] overflow-hidden hover:border-brand-red/40 transition-colors"
                    >
                      {special.imageUrl && (
                        <div className="aspect-[16/9] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={special.imageUrl}
                            alt={special.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        {ends && (
                          <p className="inline-flex items-center gap-1.5 text-xs text-brand-yellow mb-2">
                            <Clock className="h-3.5 w-3.5" /> Through {ends}
                          </p>
                        )}
                        <h2 className="font-display text-2xl font-bold text-white">
                          {special.title}
                        </h2>
                        {special.body && (
                          <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                            {special.body}
                          </p>
                        )}
                        <Link
                          href={special.ctaHref || "/order"}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-red hover:text-brand-yellow transition-colors"
                        >
                          {special.ctaLabel || "Order Now"}{" "}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {upcoming.length > 0 && (
                <div className="mt-16">
                  <h2 className="font-display text-2xl font-bold text-white">
                    Coming Up
                  </h2>
                  <div className="mt-6 space-y-3">
                    {upcoming.map((special) => (
                      <div
                        key={special.id}
                        className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#141414] p-5"
                      >
                        <CalendarDays className="h-5 w-5 text-brand-yellow flex-shrink-0" />
                        <div>
                          <p className="font-medium text-white">
                            {special.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            Starts {formatDate(special.startsAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-16 rounded-2xl border border-white/10 bg-[#141414] p-8">
                <h2 className="font-display text-xl font-bold text-white">
                  Never miss a special
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Join the Noms List — we&apos;ll email you when new specials
                  drop.
                </p>
                <div className="mt-4 max-w-md">
                  <EmailSignupForm source="footer" buttonLabel="Join" />
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
