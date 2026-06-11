"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { EmailSignupForm } from "./email-signup-form";

const STORAGE_KEY = "vn_popup_dismissed_at";
const RESHOW_AFTER_DAYS = 90;

// Don't interrupt people who are paying, giving feedback, or working in admin.
const SUPPRESSED_PREFIXES = ["/admin", "/order", "/feedback", "/unsubscribe"];

interface SignupPopupProps {
  delaySeconds: number;
  headline: string;
  offer: string;
}

export function SignupPopup({ delaySeconds, headline, offer }: SignupPopupProps) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const pathname = usePathname();

  const suppressed = SUPPRESSED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (suppressed) return;

    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - Number(dismissedAt);
        if (elapsed < RESHOW_AFTER_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {
      return; // localStorage unavailable — never show repeatedly
    }

    setArmed(true);
  }, [suppressed]);

  const trigger = useCallback(() => {
    setOpen(true);
    setArmed(false);
  }, []);

  useEffect(() => {
    if (!armed) return;

    const timer = setTimeout(trigger, delaySeconds * 1000);

    // Or on 50% scroll, whichever comes first
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      if (scrolled >= document.documentElement.scrollHeight * 0.5) {
        trigger();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [armed, delaySeconds, trigger]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  const showOffer = offer && !offer.startsWith("[FILL IN");

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#141414] p-8 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>

          <Dialog.Title className="font-display text-3xl font-bold text-white">
            <span className="text-brand-red">{headline}</span>
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm text-gray-400 leading-relaxed">
            {showOffer
              ? offer
              : "Be first to hear about new dishes, specials, and events at Vietnoms."}
          </Dialog.Description>

          <div className="mt-6">
            <EmailSignupForm
              source="popup"
              variant="full"
              buttonLabel="Join"
              onSuccess={() => {
                try {
                  localStorage.setItem(STORAGE_KEY, String(Date.now()));
                } catch {
                  // ignore
                }
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
