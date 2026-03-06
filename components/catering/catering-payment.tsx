"use client";

import { useState } from "react";
import {
  PaymentForm,
  CreditCard,
  ApplePay,
  GooglePay,
  CashAppPay,
} from "react-square-web-payments-sdk";
import { Loader2 } from "lucide-react";

interface CateringPaymentProps {
  totalCents: number;
  onPaymentComplete: (token: string) => void;
  onError: (msg: string) => void;
}

export function CateringPayment({
  totalCents,
  onPaymentComplete,
  onError,
}: CateringPaymentProps) {
  const [processing, setProcessing] = useState(false);
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

  if (!appId || !locationId) {
    return (
      <p className="text-sm text-gray-400">
        Payment is not configured yet. Please use the email inquiry option.
      </p>
    );
  }

  if (processing) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red mx-auto" />
        <p className="mt-4 text-gray-400">Processing payment...</p>
      </div>
    );
  }

  return (
    <PaymentForm
      applicationId={appId}
      locationId={locationId}
      cardTokenizeResponseReceived={(token) => {
        if (token.status !== "OK" || !token.token) {
          onError("Payment failed. Please try again.");
          return;
        }
        setProcessing(true);
        onPaymentComplete(token.token);
      }}
      createPaymentRequest={() => ({
        countryCode: "US",
        currencyCode: "USD",
        total: {
          amount: (totalCents / 100).toFixed(2),
          label: "Vietnoms Catering",
        },
      })}
    >
      <CreditCard />
      <div className="my-3 text-center text-sm text-gray-400">
        or pay with
      </div>
      <div className="space-y-2">
        <ApplePay />
        <GooglePay />
        <CashAppPay />
      </div>
    </PaymentForm>
  );
}
