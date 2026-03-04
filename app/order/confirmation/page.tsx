import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { getOrderDetails } from "@/app/order/actions";
import { formatPrice } from "@/lib/utils";
import { CartClearer } from "./cart-clearer";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { orderId?: string; transactionId?: string };
}) {
  const orderId = searchParams.orderId;
  let orderDetails = null;

  if (orderId) {
    const result = await getOrderDetails(orderId);
    if (result.success) {
      orderDetails = result.order;
    }
  }

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 text-center">
        <CartClearer />

        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="mt-6 font-display text-3xl font-bold text-brand-black">
          Order Confirmed!
        </h1>
        <p className="mt-4 text-gray-600">
          Thank you for your order. We&apos;re preparing your food now.
        </p>

        {orderId && (
          <p className="mt-2 text-sm text-gray-500">
            Order ID:{" "}
            <code className="bg-gray-100 px-2 py-0.5 rounded">{orderId}</code>
          </p>
        )}

        {orderDetails && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4 text-left space-y-2">
            {orderDetails.lineItems.map(
              (
                item: { name: string; quantity: string; totalMoney: number },
                i: number
              ) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>{formatPrice(item.totalMoney)}</span>
                </div>
              )
            )}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>{formatPrice(orderDetails.total)}</span>
            </div>
            {orderDetails.pickup && (
              <div className="border-t pt-2 mt-2 text-sm text-gray-600">
                <p>
                  <strong>Pickup for:</strong>{" "}
                  {orderDetails.pickup.recipientName}
                </p>
                {orderDetails.pickup.pickupAt && (
                  <p>
                    <strong>Pickup at:</strong>{" "}
                    {new Date(orderDetails.pickup.pickupAt).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                )}
              </div>
            )}
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
