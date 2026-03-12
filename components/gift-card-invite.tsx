"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContributionInvites } from "@/app/gift-cards/actions";
import { Plus, X, Users, CheckCircle } from "lucide-react";

interface GiftCardInviteProps {
  giftCardId: string;
  giftCardGan: string;
  organizerName: string;
  organizerEmail: string;
  recipientName: string;
}

export function GiftCardInvite({
  giftCardId,
  giftCardGan,
  organizerName,
  organizerEmail,
  recipientName,
}: GiftCardInviteProps) {
  const [expanded, setExpanded] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [inviteCount, setInviteCount] = useState(0);

  const addEmail = () => {
    if (emails.length < 20) {
      setEmails([...emails, ""]);
    }
  };

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    setEmails(emails.map((e, i) => (i === index ? value : e)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validEmails = emails.filter((e) => e.trim());
    if (validEmails.length === 0) {
      setError("Please enter at least one email address.");
      return;
    }

    setSending(true);

    const suggestedCents = suggestedAmount
      ? Math.round(parseFloat(suggestedAmount) * 100)
      : undefined;

    const result = await createContributionInvites({
      giftCardId,
      giftCardGan,
      organizerName,
      organizerEmail,
      recipientName,
      message: message.trim() || undefined,
      suggestedAmount: suggestedCents,
      inviteeEmails: validEmails,
    });

    setSending(false);

    if (result.success) {
      setSent(true);
      setInviteCount(result.inviteCount || validEmails.length);
    } else {
      setError(result.error || "Failed to send invitations.");
    }
  };

  if (sent) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
        <p className="mt-3 text-green-800 font-medium">
          {inviteCount} invitation{inviteCount !== 1 ? "s" : ""} sent!
        </p>
        <p className="mt-1 text-sm text-green-600">
          Contributors will receive an email with a link to add funds.
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-red hover:bg-red-50 transition-colors group"
      >
        <Users className="h-8 w-8 text-gray-400 group-hover:text-brand-red mx-auto" />
        <p className="mt-2 font-medium text-gray-700 group-hover:text-brand-red">
          Invite others to contribute
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Let friends and family add to this gift card
        </p>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Invite Contributors</h3>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Send an invitation to friends and family so they can add funds to{" "}
        {recipientName}&apos;s gift card.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Email inputs */}
      <div className="space-y-2">
        <Label>Contributor Email Addresses</Label>
        {emails.map((email, i) => (
          <div key={i} className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => updateEmail(i, e.target.value)}
              required={i === 0}
            />
            {emails.length > 1 && (
              <button
                type="button"
                onClick={() => removeEmail(i)}
                className="text-gray-400 hover:text-red-500 px-2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {emails.length < 20 && (
          <button
            type="button"
            onClick={addEmail}
            className="flex items-center gap-1 text-sm text-brand-red hover:underline"
          >
            <Plus className="h-4 w-4" />
            Add another
          </button>
        )}
      </div>

      {/* Suggested amount */}
      <div>
        <Label htmlFor="suggestedAmount">Suggested Contribution (optional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            $
          </span>
          <Input
            id="suggestedAmount"
            type="number"
            min="5"
            max="500"
            step="0.01"
            value={suggestedAmount}
            onChange={(e) => setSuggestedAmount(e.target.value)}
            placeholder="e.g. 25"
            className="pl-7"
          />
        </div>
      </div>

      {/* Message to contributors */}
      <div>
        <Label htmlFor="inviteMessage">Message to Contributors (optional)</Label>
        <Textarea
          id="inviteMessage"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Let's get a nice gift card for..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={sending}>
        {sending ? "Sending Invitations..." : "Send Invitations"}
      </Button>
    </form>
  );
}
