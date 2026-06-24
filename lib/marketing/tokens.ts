import crypto from "crypto";

/** URL-safe random token for unsubscribe links, feedback links, etc. */
export function generateToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
