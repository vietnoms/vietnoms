"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <div className="min-h-screen bg-[#111] -mt-20 pt-20">
      {!isLogin && <AdminNav />}
      <main>{children}</main>
    </div>
  );
}
