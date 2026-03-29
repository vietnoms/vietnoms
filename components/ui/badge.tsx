import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-red text-white",
        secondary: "border-transparent bg-gray-700/50 text-gray-300",
        outline: "border-gray-600 text-gray-300",
        vegan: "border-transparent bg-green-900/40 text-green-400",
        spicy: "border-transparent bg-red-900/40 text-red-400",
        gf: "border-transparent bg-yellow-900/40 text-yellow-400",
        favorite: "border-transparent bg-orange-900/40 text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

/** Maps a dietary/feature label to a badge variant */
function labelVariant(label: string): "vegan" | "gf" | "spicy" | "favorite" | "secondary" {
  const l = label.toLowerCase();
  if (l.includes("vegan") || l.includes("vegetarian")) return "vegan";
  if (l.includes("gluten")) return "gf";
  if (l.includes("spicy")) return "spicy";
  if (l.includes("favorite") || l.includes("fan")) return "favorite";
  return "secondary";
}

export { Badge, badgeVariants, labelVariant };
