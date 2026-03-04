import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams: { orderId?: string; receiptUrl?: string };
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="mt-6 font-display text-3xl font-bold text-brand-black">
          Order Confirmed!
        </h1>
        <p className="mt-4 text-gray-600">
          Thank you for your order. We&apos;re preparing your food now.
        </p>

        {searchParams.orderId && (
          <p className="mt-2 text-sm text-gray-500">
            Order ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{searchParams.orderId}</code>
          </p>
        )}

        {searchParams.receiptUrl && (
          <a
            href={searchParams.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-brand-red hover:underline text-sm"
          >
            View Receipt
          </a>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/order">Order More</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
