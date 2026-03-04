import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
  showLink?: boolean;
}

export function MenuItemCard({ item, showLink = true }: MenuItemCardProps) {
  const content = (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow h-full">
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-200 relative overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            {item.name}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold group-hover:text-brand-red transition-colors">
            {item.name}
          </h3>
          <span className="text-brand-red font-semibold whitespace-nowrap">
            {item.formattedPrice}
          </span>
        </div>

        {item.description && (
          <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
            {item.description}
          </p>
        )}

        {item.dietaryLabels.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {item.dietaryLabels.map((label) => (
              <Badge
                key={label}
                variant={
                  label === "VG" || label === "V"
                    ? "vegan"
                    : label === "GF"
                      ? "gf"
                      : label === "Spicy"
                        ? "spicy"
                        : "secondary"
                }
              >
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
