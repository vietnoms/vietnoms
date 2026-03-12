import type { Metadata } from "next";
import { getContributionByToken, getInvitesByContribution } from "@/lib/db/contributions";
import { GiftCardContribute } from "@/components/gift-card-contribute";
import { Gift } from "lucide-react";

export const metadata: Metadata = {
  title: "Contribute to Gift Card",
  description: "Add funds to a group Vietnoms gift card.",
};

export default async function ContributePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contribution = await getContributionByToken(token);

  if (!contribution || contribution.status !== "active") {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-xl px-4 text-center">
          <Gift className="h-16 w-16 text-gray-400 mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-bold">
            Contribution Not Found
          </h1>
          <p className="mt-2 text-gray-600">
            This contribution link is no longer active or doesn&apos;t exist.
          </p>
        </div>
      </section>
    );
  }

  const invites = await getInvitesByContribution(contribution.id);
  const totalContributed = invites
    .filter((i) => i.contributedAt)
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const contributorCount = invites.filter((i) => i.contributedAt).length;

  return (
    <>
      <section className="bg-brand-black text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Group Gift Card
          </h1>
          <p className="mt-3 text-lg text-gray-300">
            {contribution.organizerName} is putting together a gift card for{" "}
            {contribution.recipientName}
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <GiftCardContribute
            token={token}
            organizerName={contribution.organizerName}
            recipientName={contribution.recipientName}
            message={contribution.message}
            suggestedAmount={contribution.suggestedAmount}
            totalContributed={totalContributed}
            contributorCount={contributorCount}
          />
        </div>
      </section>
    </>
  );
}
