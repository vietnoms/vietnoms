"use client";

import { CreditCard, PaymentForm } from "react-square-web-payments-sdk";

interface PaymentFormWrapperProps {
  onPaymentSuccess: (token: string) => void;
}

export function PaymentFormWrapper({
  onPaymentSuccess,
}: PaymentFormWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

  if (!appId || !locationId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
        Payment system is not configured. Please contact the restaurant to place
        your order by phone.
      </div>
    );
  }

  return (
    <PaymentForm
      applicationId={appId}
      locationId={locationId}
      cardTokenizeResponseReceived={(token) => {
        if (token.status === "OK" && "token" in token) {
          onPaymentSuccess(token.token as string);
        }
      }}
    >
      <CreditCard />
    </PaymentForm>
  );
}
