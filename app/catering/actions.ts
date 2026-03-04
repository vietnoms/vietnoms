"use server";

import type { CateringInquiry } from "@/lib/types";

export async function submitCateringInquiry(data: CateringInquiry) {
  // Validate
  if (!data.name || !data.email || !data.phone || !data.eventDate || !data.guestCount) {
    return { success: false, error: "All required fields must be filled." };
  }

  try {
    // TODO: Send email notification via Resend or similar service
    // For now, log the inquiry
    console.log("Catering inquiry received:", data);

    // In production, you would:
    // 1. Send email to restaurant owner
    // 2. Send confirmation email to customer
    // 3. Store inquiry in database

    return { success: true };
  } catch (error) {
    console.error("Failed to submit catering inquiry:", error);
    return { success: false, error: "Failed to submit inquiry. Please try again." };
  }
}
