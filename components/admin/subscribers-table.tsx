"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, Users, TrendingUp, UserMinus } from "lucide-react";

interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  status: string;
  unsubscribeToken: string;
  consentAt: string;
  createdAt: string;
}

interface Stats {
  total: number;
  unsubscribed: number;
  last30Days: number;
  bySource: Record<string, number>;
}

const SOURCE_TABS = [
  { label: "All", value: "" },
  { label: "Footer", value: "footer" },
  { label: "Popup", value: "popup" },
  { label: "Checkout", value: "checkout" },
  { label: "Catering", value: "catering" },
  { label: "Rewards", value: "rewards" },
];

const SOURCE_COLORS: Record<string, string> = {
  footer: "bg-blue-600/20 text-blue-400",
  popup: "bg-purple-600/20 text-purple-400",
  checkout: "bg-green-600/20 text-green-400",
  catering: "bg-orange-600/20 text-orange-400",
  rewards: "bg-yellow-600/20 text-yellow-400",
};

export function SubscribersTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("subscribed");
  const [search, setSearch] = useState("");

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (status) params.set("status", status);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/subscribers?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSubscribers(data.subscribers);
      setTotal(data.total);
      setStats(data.stats);
    }
    setLoading(false);
  }, [source, status, search]);

  useEffect(() => {
    const timer = setTimeout(fetchSubscribers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchSubscribers, search]);

  const removeSubscriber = async (subscriber: Subscriber) => {
    if (!confirm(`Unsubscribe ${subscriber.email}?`)) return;
    await fetch("/api/admin/subscribers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: subscriber.unsubscribeToken }),
    });
    fetchSubscribers();
  };

  const exportUrl = `/api/admin/subscribers/export?${new URLSearchParams({
    ...(source ? { source } : {}),
    ...(status ? { status } : {}),
  })}`;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-800 bg-surface p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Users className="h-4 w-4" /> Active subscribers
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-surface p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <TrendingUp className="h-4 w-4" /> Added last 30 days
            </div>
            <p className="mt-2 text-3xl font-bold text-brand-yellow">
              +{stats.last30Days}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-surface p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <UserMinus className="h-4 w-4" /> Unsubscribed
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-400">
              {stats.unsubscribed}
            </p>
          </div>
        </div>
      )}

      {/* Source breakdown */}
      {stats && Object.keys(stats.bySource).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.bySource).map(([key, count]) => (
            <span
              key={key}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${SOURCE_COLORS[key] || "bg-gray-600/20 text-gray-400"}`}
            >
              {key}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSource(tab.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              source === tab.value
                ? "bg-brand-red/10 text-brand-red"
                : "text-gray-400 hover:text-white hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or name..."
            className="px-3 py-1.5 bg-surface-alt border border-gray-700 rounded-md text-sm text-white placeholder:text-gray-500 focus:border-brand-red focus:outline-none w-56"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
          >
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="">All</option>
          </select>
          <a
            href={exportUrl}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No subscribers found</p>
          <p className="mt-2 text-sm">
            Signups from the footer, popup, checkout, catering, and rewards
            pages will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <p className="text-xs text-gray-500 mb-2">
            {total} result{total === 1 ? "" : "s"}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr
                  key={subscriber.id}
                  className="border-b border-gray-800/50 text-gray-300"
                >
                  <td className="px-3 py-2 font-medium text-white">
                    {subscriber.email}
                  </td>
                  <td className="px-3 py-2">{subscriber.name || "—"}</td>
                  <td className="px-3 py-2">{subscriber.phone || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[subscriber.source] || "bg-gray-600/20 text-gray-400"}`}
                    >
                      {subscriber.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {subscriber.createdAt?.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {subscriber.status === "subscribed" && (
                      <button
                        onClick={() => removeSubscriber(subscriber)}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Unsubscribe
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
