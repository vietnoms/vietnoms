"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface CateringRequest {
  id: number;
  status: string;
  eventDate: string;
  guestCount: number;
  packageType: string;
  customizations: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  deliveryType: string;
  deliveryAddress: string | null;
  deliveryFee: number;
  totalAmount: number | null;
  squareOrderId: string | null;
  squarePaymentId: string | null;
  notes: string | null;
  fulfillmentType: string;
  createdAt: string;
  updatedAt: string;
}

interface CateringItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
}

const TABS = ["all", "draft", "submitted", "paid", "completed", "cancelled"] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-600",
  submitted: "bg-blue-600",
  paid: "bg-green-600",
  completed: "bg-emerald-600",
  cancelled: "bg-red-600",
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CateringTable() {
  const [requests, setRequests] = useState<CateringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<CateringItem[]>([]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        activeTab === "all"
          ? "/api/catering"
          : `/api/catering?status=${activeTab}`;
      const res = await fetch(url);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedItems([]);
      return;
    }
    setExpandedId(id);
    try {
      const res = await fetch(`/api/catering/${id}`);
      const data = await res.json();
      setExpandedItems(data.items || []);
    } catch {
      setExpandedItems([]);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/catering/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchRequests();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      {/* Tab filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-brand-red text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRequests}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          No catering requests found.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden md:grid grid-cols-8 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
            <div>Status</div>
            <div>Contact</div>
            <div>Event Date</div>
            <div>Guests</div>
            <div>Package</div>
            <div>Total</div>
            <div>Created</div>
            <div>Actions</div>
          </div>

          {requests.map((req) => (
            <Card key={req.id} className="border-gray-800">
              <CardContent className="p-0">
                {/* Row */}
                <button
                  onClick={() => toggleExpand(req.id)}
                  className="w-full text-left px-4 py-3 grid grid-cols-2 md:grid-cols-8 gap-4 items-center hover:bg-surface-alt/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${STATUS_COLORS[req.status] || "bg-gray-600"} text-white text-xs capitalize`}
                    >
                      {req.status}
                    </Badge>
                    {req.status === "draft" && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="text-sm text-white truncate">
                    {req.contactName}
                  </div>
                  <div className="text-sm text-gray-400">{req.eventDate}</div>
                  <div className="text-sm text-gray-400">{req.guestCount}</div>
                  <div className="text-sm text-gray-400 capitalize">
                    {req.packageType}
                  </div>
                  <div className="text-sm text-white">
                    {req.totalAmount != null
                      ? formatMoney(req.totalAmount)
                      : "—"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-end">
                    {expandedId === req.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedId === req.id && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">
                          <strong className="text-white">Email:</strong>{" "}
                          {req.contactEmail}
                        </p>
                        <p className="text-gray-400">
                          <strong className="text-white">Phone:</strong>{" "}
                          {req.contactPhone}
                        </p>
                        <p className="text-gray-400">
                          <strong className="text-white">Delivery:</strong>{" "}
                          {req.deliveryType === "pickup"
                            ? "Pickup"
                            : req.deliveryAddress || "Delivery"}
                          {req.deliveryFee > 0 &&
                            ` (fee: ${formatMoney(req.deliveryFee)})`}
                        </p>
                        <p className="text-gray-400">
                          <strong className="text-white">Fulfillment:</strong>{" "}
                          {req.fulfillmentType === "payment"
                            ? "Paid Online"
                            : "Email Inquiry"}
                        </p>
                      </div>
                      <div>
                        {req.squareOrderId && (
                          <p className="text-gray-400">
                            <strong className="text-white">Square Order:</strong>{" "}
                            {req.squareOrderId}
                          </p>
                        )}
                        {req.squarePaymentId && (
                          <p className="text-gray-400">
                            <strong className="text-white">Payment ID:</strong>{" "}
                            {req.squarePaymentId}
                          </p>
                        )}
                        {req.notes && (
                          <p className="text-gray-400">
                            <strong className="text-white">Notes:</strong>{" "}
                            {req.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Line items */}
                    {expandedItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">
                          Items
                        </h4>
                        <div className="space-y-1">
                          {expandedItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm text-gray-400"
                            >
                              <span>
                                {item.itemName} x{item.quantity}
                              </span>
                              {item.unitPrice != null && (
                                <span>
                                  {formatMoney(item.unitPrice * item.quantity)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {req.status !== "completed" &&
                        req.status !== "cancelled" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(req.id, "completed")}
                          >
                            Mark Completed
                          </Button>
                        )}
                      {req.status !== "cancelled" &&
                        req.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(req.id, "cancelled")}
                          >
                            Cancel
                          </Button>
                        )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
