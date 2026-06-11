import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, labelVariant } from "@/components/ui/badge";
import type { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
  showLink?: boolean;
  /** Merchandising chips like "Popular" or "Staff Pick", overlaid on the photo */
  badges?: string[];
}

export function MenuItemCard({ item, showLink = true, badges }: MenuItemCardProps) {
  const content = (
    <Card
      className={`group overflow-hidden hover:shadow-md hover:-translate-y-0.5 h-full ${
        item.soldOut ? "opacity-60" : ""
      }`}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-800 relative overflow-hidden">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            {item.name}
          </div>
        )}
        {item.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-white text-brand-black font-semibold text-sm px-3 py-1 rounded-full">
              Sold Out
            </span>
          </div>
        )}
        {badges && badges.length > 0 && !item.soldOut && (
          <div className="absolute top-2 left-2 flex gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-brand-red px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold group-hover:text-brand-red transition-colors">
            {item.name}
          </h3>
          <span className="text-brand-red font-semibold whitespace-nowrap">
            {item.soldOut ? "Sold Out" : item.formattedPrice}
          </span>
        </div>

        {item.description && (
          <p className="mt-1.5 text-sm text-gray-400 line-clamp-2">
            {item.description}
          </p>
        )}

        {item.dietaryLabels.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {item.dietaryLabels.map((label) => (
              <Badge key={label} variant={labelVariant(label)}>
                {label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (showLink) {
    return <Link href={`/menu/${item.slug}`}>{content}</Link>;
  }

  return content;
}
