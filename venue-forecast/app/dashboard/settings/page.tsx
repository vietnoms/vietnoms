"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { config } from "@/lib/config";

interface Venue {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  priority: number;
}

export default function SettingsPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [priority, setPriority] = useState(false);

  const fetchVenues = useCallback(async () => {
    const res = await fetch("/api/venues");
    const data = await res.json();
    setVenues(data.venues);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        address,
        city,
        priority: priority ? 1 : 0,
      }),
    });
    setName("");
    setCity("");
    setAddress("");
    setPriority(false);
    fetchVenues();
  };

  const handleUnsubscribe = async (id: number) => {
    await fetch(`/api/venues?id=${id}`, { method: "DELETE" });
    fetchVenues();
  };

  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-gray-400">
          Manage your venue subscriptions on {config.appName}.
        </p>

        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-gray-800 bg-surface p-6">
            <h2 className="text-lg font-semibold text-white">
              Subscribed Venues
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Subscribe to the event venues that drive traffic to your
              restaurant. If a venue already exists in the network, you&apos;ll
              automatically share anonymized event insights with peers.
            </p>

            <form
              onSubmit={handleAdd}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Venue Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Austin Convention Center"
                  className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  City (optional)
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin"
                  className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Address (optional)
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded bg-surface-alt px-3 py-2 text-sm text-white border border-gray-700 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex items-end justify-between gap-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priority}
                    onChange={(e) => setPriority(e.target.checked)}
                    className="rounded"
                  />
                  High Impact (pin to top of filter)
                </label>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  <Plus className="h-4 w-4" />
                  Subscribe
                </button>
              </div>
            </form>

            {loading ? (
              <p className="mt-6 text-sm text-gray-500">Loading...</p>
            ) : venues.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500">
                No subscriptions yet. Start by subscribing to a venue above.
              </p>
            ) : (
              <div className="mt-6 divide-y divide-gray-800">
                {venues.map((venue) => (
                  <div
                    key={venue.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-2">
                      {venue.priority > 0 && (
                        <Star
                          className="h-4 w-4 text-amber-400"
                          fill="currentColor"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {venue.name}
                        </p>
                        {(venue.address || venue.city) && (
                          <p className="text-xs text-gray-400">
                            {[venue.address, venue.city]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnsubscribe(venue.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                      title="Unsubscribe from this venue"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
