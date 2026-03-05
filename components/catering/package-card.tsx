"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface PackageCardProps {
  name: string;
  description: string;
  recommended?: boolean;
  selected: boolean;
  onSelect: () => void;
  features: string[];
}

export function PackageCard({
  name,
  description,
  recommended,
  selected,
  onSelect,
  features,
}: PackageCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? "border-brand-red ring-2 ring-brand-red/20"
          : "border-gray-700 hover:border-gray-500"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              {name}
            </h3>
            {recommended && (
              <span className="inline-block mt-1 text-xs font-medium text-brand-yellow bg-brand-yellow/10 px-2 py-0.5 rounded-full">
                Recommended for your group
              </span>
            )}
          </div>
          {selected && (
            <CheckCircle className="h-6 w-6 text-brand-red flex-shrink-0" />
          )}
        </div>
        <p className="mt-2 text-sm text-gray-400">{description}</p>
        <ul className="mt-3 space-y-1">
          {features.map((f) => (
            <li key={f} className="text-sm text-gray-400 flex items-start gap-2">
              <span className="text-brand-red mt-0.5">&#10003;</span>
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
