"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type Step = "phone" | "code" | "success";

export function LoginDialog() {
  const { showLogin, setShowLogin, refreshSession } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep("phone");
    setPhone("");
    setCode("");
    setError("");
    setLoading(false);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send code");
      }

      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid code");
      }

      setStep("success");
      await refreshSession();
      setTimeout(() => {
        setShowLogin(false);
        reset();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={showLogin}
      onOpenChange={(open) => {
        setShowLogin(open);
        if (!open) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "phone" && "Sign In"}
            {step === "code" && "Enter Code"}
            {step === "success" && "Welcome!"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone" && "Enter your phone number to sign in or create an account."}
            {step === "code" && `We sent a 6-digit code to ${phone}.`}
            {step === "success" && "You're signed in."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <Label htmlFor="login-phone">Phone Number</Label>
              <Input
                id="login-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(408) 555-0123"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Code
            </Button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <Label htmlFor="login-code">Verification Code</Label>
              <Input
                id="login-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify
            </Button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setError(""); }}
              className="text-sm text-gray-400 hover:text-gray-300 w-full text-center"
            >
              Use a different number
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <div className="text-green-500 text-4xl mb-2">&#10003;</div>
            <p className="text-gray-400">Signed in successfully!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
