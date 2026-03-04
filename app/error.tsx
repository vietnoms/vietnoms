"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-display text-4xl font-bold text-brand-black">
          Something Went Wrong
        </h1>
        <p className="mt-4 text-gray-600">
          We&apos;re sorry — something unexpected happened. Please try again.
        </p>
        <Button onClick={reset} className="mt-8">
          Try Again
        </Button>
      </div>
    </section>
  );
}
