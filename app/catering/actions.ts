"use server";

import type { CateringInquiry } from "@/lib/types";
import { createCateringRequest } from "@/lib/db/catering";
import { sendCateringInquiryEmails } from "@/lib/email";

export async function submitCateringInquiry(data: CateringInquiry) {
  if (!data.name || !data.email || !data.phone || !data.eventDate || !data.guestCount) {
    return { success: false, error: "All required fields must be filled." };
  }

  try {
    const { id } = await createCateringRequest({
      status: "submitted",
      eventDate: data.eventDate,
      guestCount: data.guestCount,
      packageType: data.packageInterest || "custom",
      contactName: data.name,
      contactEmail: data.email,
      contactPhone: data.phone,
      notes: data.notes,
      fulfillmentType: "email",
    });

    // Send emails (non-blocking)
    sendCateringInquiryEmails({
      contactName: data.name,
      contactEmail: data.email,
      contactPhone: data.phone,
      eventDate: data.eventDate,
      guestCount: data.guestCount,
      packageType: data.packageInterest || "custom",
      deliveryType: "pickup",
      items: [],
      notes: data.notes,
    }).catch((err) => console.error("Failed to send catering emails:", err));

    return { success: true, id };
  } catch (error) {
    console.error("Failed to submit catering inquiry:", error);
    return { success: false, error: "Failed to submit inquiry. Please try again." };
  }
}
