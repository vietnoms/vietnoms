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
