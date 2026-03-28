"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface Purchase {
  id: number;
  type: string;
  status: string;
  amount: number;
  squarePaymentId: string | null;
  squareOrderId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  giftCardGan: string | null;
  metadata: string | null;
  errorMessage: string | null;
  createdAt: string;
}

function parseMeta(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

const TABS = [
  { label: "All", value: "" },
  { label: "Gift Card", value: "gift_card" },
  { label: "Catering", value: "catering" },
  { label: "Order", value: "order" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-600/20 text-yellow-400",
  completed: "bg-green-600/20 text-green-400",
  failed: "bg-red-600/20 text-red-400",
  refunded: "bg-orange-600/20 text-orange-400",
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function PurchasesTable() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);

    const res = await fetch(`/api/admin/purchases?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPurchases(data.purchases);
    }
    setLoading(false);
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const showGiftCardCol = filterType === "gift_card" || (!filterType && purchases.some((p) => p.type === "gift_card"));

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterType === tab.value
                ? "bg-brand-red/10 text-brand-red"
                : "text-gray-400 hover:text-white hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="ml-auto px-3 py-1.5 bg-surface-alt border border-gray-700 rounded-md text-sm text-white focus:border-brand-red focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No purchases found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Loyalty</th>
                <th className="px-3 py-2">Receipt</th>
                {showGiftCardCol && <th className="px-3 py-2">Gift Card #</th>}
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const meta = parseMeta(p.metadata);
                const receiptUrl = (meta.receiptUrl as string) || null;
                const tipAmount = (meta.tipAmount as number) || 0;

                return (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-surface-alt/50">
                    <td className="px-3 py-2 text-gray-300">{p.id}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded capitalize">
                        {p.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white font-medium">
                      {formatMoney(p.amount)}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {tipAmount > 0 ? (
                        <span className="text-green-400">{formatMoney(tipAmount)}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-white">{p.customerName || "—"}</div>
                      {p.customerEmail && (
                        <div className="text-xs text-gray-500">{p.customerEmail}</div>
                      )}
                      {p.customerPhone && (
                        <div className="text-xs text-gray-500">{p.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 text-xs rounded ${STATUS_COLORS[p.status] || "bg-gray-700 text-gray-300"}`}>
                        {p.status}
                      </span>
                      {p.errorMessage && (
                        <div className="text-xs text-red-400 mt-0.5 max-w-[200px] truncate" title={p.errorMessage}>
                          {p.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {(() => {
                        const enrolled = meta.loyaltyEnrolled as boolean | undefined;
                        const pts = meta.loyaltyPointsEarned as number | undefined;
                        const bal = meta.loyaltyBalance as number | undefined;
                        if (enrolled) {
                          return (
                            <div>
                              <span className="text-green-400">Enrolled</span>
                              {pts != null && <div className="text-gray-400">+{pts} pts</div>}
                              {bal != null && <div className="text-gray-500">Bal: {bal}</div>}
                            </div>
                          );
                        }
                        return <span className="text-gray-600">—</span>;
                      })()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {receiptUrl ? (
                        <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">
                          View
                        </a>
                      ) : "—"}
                    </td>
                    {showGiftCardCol && (
                      <td className="px-3 py-2 text-gray-400 text-xs font-mono">
                        {p.giftCardGan || "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
