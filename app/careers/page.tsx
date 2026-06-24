import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getMarketingSettings } from "@/lib/marketing/settings";
import { ApplicationForm } from "@/components/careers/application-form";
import { BreadcrumbSchema } from "@/components/schema-markup";

export const metadata: Metadata = {
  title: "Careers | Join the Vietnoms Team",
  description:
    "Work at Vietnoms in downtown San Jose. See open roles and apply online.",
};

export const revalidate = 300;

export default async function CareersPage() {
  const settings = await getMarketingSettings();
  const roles = settings.careersRoles;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Careers", url: "/careers" },
        ]}
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="font-display text-brand-red tracking-[0.3em] text-sm">
            JOIN THE TEAM
          </p>
          <h1 className="mt-2 font-display text-5xl md:text-6xl font-bold text-white">
            Careers
          </h1>
          <p className="mt-4 text-gray-400 max-w-2xl">
            We&apos;re a small team in downtown San Jose&apos;s SoFa Market that
            cares a lot about food and the people we serve. If that sounds like
            you, we&apos;d love to meet you.
          </p>

          {/* Open roles */}
          <div className="mt-12">
            <h2 className="font-display text-2xl font-bold text-white">
              Open roles
            </h2>
            {roles.length === 0 ? (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-[#141414] p-6">
                <Users className="h-5 w-5 text-brand-yellow flex-shrink-0 mt-0.5" />
                <p className="text-gray-400 text-sm leading-relaxed">
                  No specific openings posted right now — but we&apos;re always
                  happy to hear from great people. Send a general application
                  below and we&apos;ll keep it on file.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {roles.map((role) => (
                  <div
                    key={role.title}
                    className="rounded-xl border border-white/10 bg-[#141414] p-6"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-xl font-bold text-white">
                        {role.title}
                      </h3>
                      {role.type && (
                        <span className="rounded-full bg-brand-yellow/10 px-2.5 py-0.5 text-xs font-medium text-brand-yellow">
                          {role.type}
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                        {role.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application form */}
          <div className="mt-12 max-w-2xl">
            <ApplicationForm roles={roles.map((role) => role.title)} />
          </div>
        </div>
      </section>
    </>
  );
}
