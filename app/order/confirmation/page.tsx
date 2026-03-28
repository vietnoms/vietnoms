import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink } from "lucide-react";
import { getOrderDetails } from "@/app/order/actions";
import { formatPrice } from "@/lib/utils";
import { CartClearer } from "./cart-clearer";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

const RESTAURANT_TZ = "America/Los_Angeles";

function formatPickupTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: RESTAURANT_TZ,
  });
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { orderId?: string; transactionId?: string; receiptUrl?: string };
}) {
  const orderId = searchParams.orderId;
  const receiptUrl = searchParams.receiptUrl;
  let orderDetails = null;

  if (orderId) {
    const result = await getOrderDetails(orderId);
    if (result.success) {
      orderDetails = result.order;
    }
  }

  const isAsap = orderDetails?.pickup?.scheduleType === "ASAP";
  const pickupTime = orderDetails?.pickup?.pickupAt
    ? formatPickupTime(orderDetails.pickup.pickupAt)
    : null;

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 text-center">
        <CartClearer />

        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="mt-6 font-display text-3xl font-bold text-white">
          Order Confirmed!
        </h1>

        {isAsap ? (
          <p className="mt-4 text-gray-300">
            Your order will be ready for pickup in <strong className="text-white">10-15 minutes</strong>.
          </p>
        ) : pickupTime ? (
          <p className="mt-4 text-gray-300">
            Your order will be ready for pickup at <strong className="text-white">{pickupTime}</strong>.
          </p>
        ) : (
          <p className="mt-4 text-gray-300">
            Thank you for your order!
          </p>
        )}

        <p className="mt-2 text-sm text-gray-400">
          Head to the counter and show the cashier this receipt to pick up.
        </p>

        {orderId && (
          <p className="mt-3 text-sm text-gray-500">
            Order ID:{" "}
            <code className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">{orderId}</code>
          </p>
        )}

        {orderDetails && (
          <div className="mt-6 bg-surface-alt rounded-lg p-4 text-left space-y-2">
            {orderDetails.lineItems.map(
              (
                item: { name: string; quantity: string; totalMoney: number },
                i: number
              ) => (
                <div key={i} className="flex justify-between text-sm text-gray-200">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>{formatPrice(item.totalMoney)}</span>
                </div>
              )
            )}
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold text-sm text-white">
              <span>Total</span>
              <span>{formatPrice(orderDetails.total)}</span>
            </div>
            {orderDetails.pickup && (
              <div className="border-t border-gray-700 pt-2 mt-2 text-sm text-gray-300">
                <p>
                  <strong>Pickup for:</strong>{" "}
                  {orderDetails.pickup.recipientName}
                </p>
                {!isAsap && pickupTime && (
                  <p>
                    <strong>Pickup at:</strong> {pickupTime}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {receiptUrl && (
          <div className="mt-6">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface-alt border border-gray-700 rounded-lg text-sm text-gray-200 hover:border-gray-500 hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Receipt
            </a>
          </div>
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
