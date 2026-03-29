"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  PenTool,
  CheckSquare,
  Calendar,
  ImageIcon,
  Code,
  LogOut,
  Wand2,
  Receipt,
  Film,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/hero", label: "Hero", icon: Film },
  { href: "/admin/catering", label: "Catering", icon: UtensilsCrossed },
  { href: "/admin/purchases", label: "Purchases", icon: Receipt },
  { href: "/admin/content", label: "Content", icon: PenTool },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/seo", label: "SEO Audit", icon: CheckSquare },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/schema", label: "Schema", icon: Code },
  { href: "/admin/image-studio", label: "Studio", icon: Wand2 },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <nav className="border-b border-gray-800 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-display text-xl text-brand-red mr-4">
              VIETNOMS HQ
            </span>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-red/10 text-brand-red"
                      : "text-gray-400 hover:text-white hover:bg-surface-alt"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-surface-alt transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
