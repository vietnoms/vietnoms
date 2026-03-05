"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitCateringInquiry } from "@/app/catering/actions";
import { CheckCircle } from "lucide-react";

export function CateringForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await submitCateringInquiry({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      eventDate: formData.get("eventDate") as string,
      guestCount: Number(formData.get("guestCount")),
      packageInterest: formData.get("packageInterest") as string,
      notes: formData.get("notes") as string,
    });

    setLoading(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Something went wrong.");
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="mt-4 font-display text-xl font-bold">
          Inquiry Submitted!
        </h3>
        <p className="mt-2 text-gray-400">
          Thank you! We&apos;ll get back to you within 24 hours with a custom
          quote.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="(408) 555-0123"
          />
        </div>
        <div>
          <Label htmlFor="eventDate">Event Date *</Label>
          <Input id="eventDate" name="eventDate" type="date" required />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="guestCount">Number of Guests *</Label>
          <Input
            id="guestCount"
            name="guestCount"
            type="number"
            min="10"
            required
            placeholder="50"
          />
        </div>
        <div>
          <Label htmlFor="packageInterest">Package Interest</Label>
          <select
            id="packageInterest"
            name="packageInterest"
            className="flex h-10 w-full rounded-md border border-gray-600 bg-surface-high text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
          >
            <option value="">Select a package</option>
            <option value="banh-mi-spread">Banh Mi Spread</option>
            <option value="pho-bar">Pho Bar</option>
            <option value="full-feast">Full Vietnamese Feast</option>
            <option value="custom">Custom / Not Sure</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Additional Details</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Tell us about your event — venue, dietary needs, special requests, etc."
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Submit Inquiry"}
      </Button>
    </form>
  );
}
