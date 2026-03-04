"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { createSquareOrder, processPayment } from "@/app/order/actions";
import { PaymentFormWrapper } from "./payment-form-wrapper";

type Step = "info" | "review" | "payment" | "processing";

export function CheckoutForm() {
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<Step>("info");
  const [orderId, setOrderId] = useState<string>("");
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [error, setError] = useState<string>("");

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    pickupTime: "",
    notes: "",
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Your cart is empty. Add items to place an order.</p>
      </div>
    );
  }

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("review");
  };

  const handleCreateOrder = async () => {
    setStep("processing");
    setError("");

    const lineItems = items.map((item) => ({
      catalogObjectId: item.variationId,
      quantity: item.quantity,
      modifiers: item.modifiers.map((m) => ({ catalogObjectId: m.id })),
      note: item.specialInstructions,
    }));

    const result = await createSquareOrder(lineItems, {
      type: "PICKUP",
      pickupDetails: {
        recipientName: customerInfo.name,
        recipientPhone: customerInfo.phone,
        recipientEmail: customerInfo.email,
        pickupAt: customerInfo.pickupTime || undefined,
        note: customerInfo.notes || undefined,
      },
    });

    if (result.success && result.orderId) {
      setOrderId(result.orderId);
      setOrderTotal(result.totalMoney || total);
      setStep("payment");
    } else {
      setError(result.error || "Failed to create order. Please try again.");
      setStep("review");
    }
  };

  const handlePaymentSuccess = async (token: string) => {
    setStep("processing");
    const result = await processPayment(token, orderId, orderTotal);

    if (result.success) {
      clearCart();
      window.location.href = `/order/confirmation?orderId=${orderId}&receiptUrl=${encodeURIComponent(result.receiptUrl || "")}`;
    } else {
      setError(result.error || "Payment failed. Please try again.");
      setStep("payment");
    }
  };

  return (
    <div className="max-w-xl">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {(["info", "review", "payment"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === s || (["review", "payment"].indexOf(step) >= i)
                  ? "bg-brand-red text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-sm text-gray-600 capitalize hidden sm:inline">
              {s === "info" ? "Details" : s}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Customer Info */}
      {step === "info" && (
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <h2 className="font-display text-xl font-bold">Pickup Details</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="(408) 555-0123"
              />
            </div>
            <div>
              <Label htmlFor="pickupTime">Pickup Time (optional)</Label>
              <Input
                id="pickupTime"
                type="time"
                value={customerInfo.pickupTime}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({
                    ...prev,
                    pickupTime: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave blank for ASAP pickup.
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Special Instructions</Label>
              <Textarea
                id="notes"
                value={customerInfo.notes}
                onChange={(e) =>
                  setCustomerInfo((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Any allergies or special requests?"
                rows={2}
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full">
            Continue to Review
          </Button>
        </form>
      )}

      {/* Step 2: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Review Order</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.menuItem.name}
                </span>
                <span>{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p><strong>Name:</strong> {customerInfo.name}</p>
            <p><strong>Phone:</strong> {customerInfo.phone}</p>
            <p><strong>Pickup:</strong> {customerInfo.pickupTime || "ASAP"}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("info")}
              className="flex-1"
            >
              Back
            </Button>
            <Button onClick={handleCreateOrder} className="flex-1">
              Place Order & Pay
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === "payment" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Payment</h2>
          <p className="text-sm text-gray-600">
            Total: <strong className="text-brand-red">{formatPrice(orderTotal)}</strong>
          </p>
          <PaymentFormWrapper onPaymentSuccess={handlePaymentSuccess} />
        </div>
      )}

      {/* Processing */}
      {step === "processing" && (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-brand-red border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Processing your order...</p>
        </div>
      )}
    </div>
  );
}
