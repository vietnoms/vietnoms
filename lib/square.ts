import { SquareClient, SquareEnvironment } from "square";

function getSquareClient(): SquareClient {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("SQUARE_ACCESS_TOKEN is not set");
  }

  return new SquareClient({
    token: accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

let _client: SquareClient | null = null;

export function getSquare(): SquareClient {
  if (!_client) {
    _client = getSquareClient();
  }
  return _client;
}

/** Convert Square BigInt amount to number (cents) */
export function toNumber(value: bigint | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

/** Convert Square BigInt amount to formatted dollar string */
export function toDollars(value: bigint | number | null | undefined): string {
  const cents = toNumber(value);
  return `$${(cents / 100).toFixed(2)}`;
}

export const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

/** Turn a Square SDK error into a message safe to show the customer. */
export function getSquareErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    // Square SDK errors have an `errors` array
    const sqErr = error as { errors?: { detail?: string; code?: string }[] };
    if (sqErr.errors?.length) {
      const first = sqErr.errors[0];
      if (first.code === "CARD_DECLINED") return "Your card was declined. Please try a different payment method.";
      if (first.code === "INSUFFICIENT_FUNDS") return "Insufficient funds. Please try a different payment method.";
      if (first.code === "INVALID_CARD") return "Invalid card details. Please check and try again.";
      if (first.code === "CVV_FAILURE") return "CVV check failed. Please verify your card details.";
      if (first.code === "INVALID_EXPIRATION") return "Card expiration is invalid. Please check and try again.";
      if (first.detail) return first.detail;
    }
    if ("message" in error && typeof (error as { message: string }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return "An unexpected error occurred. Please try again.";
}
