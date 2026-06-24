import type { Metadata } from "next";
import { getSubscriberByToken, unsubscribeByToken } from "@/lib/db/subscribers";
import { ResubscribeButton } from "@/components/marketing/resubscribe-button";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
}: {
  params: { token: string };
}) {
  let found = false;
  let email = "";

  try {
    const subscriber = await getSubscriberByToken(params.token);
    if (subscriber) {
      found = true;
      email = subscriber.email;
      if (subscriber.status === "subscribed") {
        await unsubscribeByToken(params.token);
      }
    }
  } catch (error) {
    console.error("Unsubscribe page error:", error);
  }

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-lg px-4 sm:px-6 text-center">
        {found ? (
          <>
            <h1 className="font-display text-4xl font-bold text-white">
              You&apos;re unsubscribed
            </h1>
            <p className="mt-4 text-gray-400">
              {email} will no longer receive marketing emails from Vietnoms.
              You&apos;ll still get receipts and order confirmations.
            </p>
            <p className="mt-2 text-gray-500 text-sm">
              Changed your mind?
            </p>
            <div className="mt-6 flex justify-center">
              <ResubscribeButton email={email} />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-bold text-white">
              Link not found
            </h1>
            <p className="mt-4 text-gray-400">
              This unsubscribe link is invalid or has expired. If you keep
              receiving emails you don&apos;t want, contact us at{" "}
              <a
                href="mailto:catering@vietnoms.com"
                className="text-brand-yellow hover:underline"
              >
                catering@vietnoms.com
              </a>{" "}
              and we&apos;ll take care of it.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
