import twilio from "twilio";

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(accountSid, authToken);
}

function getVerifyServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error("TWILIO_VERIFY_SERVICE_SID is not set");
  return sid;
}

/** Normalize phone to E.164 format (assumes US if no country code) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // Already has country code or international format
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    const normalized = normalizePhone(phone);
    await client.verify.v2
      .services(getVerifyServiceSid())
      .verifications.create({ to: normalized, channel: "sms" });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send OTP:", error);
    return { success: false, error: error.message || "Failed to send verification code" };
  }
}

export async function verifyOTP(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    const normalized = normalizePhone(phone);
    const check = await client.verify.v2
      .services(getVerifyServiceSid())
      .verificationChecks.create({ to: normalized, code });

    if (check.status === "approved") {
      return { success: true };
    }
    return { success: false, error: "Invalid verification code" };
  } catch (error: any) {
    console.error("Failed to verify OTP:", error);
    return { success: false, error: error.message || "Verification failed" };
  }
}

/** Send an SMS message via Twilio */
export async function sendSms(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) throw new Error("TWILIO_PHONE_NUMBER is not set");
    const normalized = normalizePhone(to);
    await client.messages.create({ to: normalized, from, body });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send SMS:", error);
    return { success: false, error: error.message || "Failed to send text message" };
  }
}
