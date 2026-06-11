"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

export function ApplicationForm({ roles }: { roles: string[] }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: roles[0] || "General application",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-brand-yellow/10 flex items-center justify-center">
          <Check className="h-7 w-7 text-brand-yellow" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold text-white">
          Application received!
        </h3>
        <p className="mt-2 text-gray-400">
          Thanks, {form.name.split(" ")[0]} — we&apos;ll be in touch if
          there&apos;s a fit.
        </p>
      </div>
    );
  }

  const inputClasses =
    "w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-[#141414] p-6 sm:p-8 space-y-4"
    >
      <h3 className="font-display text-2xl font-bold text-white">Apply</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="careers-name" className="block text-sm text-gray-400 mb-1">
            Name *
          </label>
          <input
            id="careers-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="careers-role" className="block text-sm text-gray-400 mb-1">
            Role *
          </label>
          <select
            id="careers-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={inputClasses}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
            <option value="General application">General application</option>
          </select>
        </div>
        <div>
          <label htmlFor="careers-email" className="block text-sm text-gray-400 mb-1">
            Email *
          </label>
          <input
            id="careers-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="careers-phone" className="block text-sm text-gray-400 mb-1">
            Phone
          </label>
          <input
            id="careers-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
            className={inputClasses}
          />
        </div>
      </div>
      <div>
        <label htmlFor="careers-message" className="block text-sm text-gray-400 mb-1">
          Tell us about yourself
        </label>
        <textarea
          id="careers-message"
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Experience, availability, and why you'd like to work with us"
          className={inputClasses}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
      >
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit Application
      </button>
    </form>
  );
}
