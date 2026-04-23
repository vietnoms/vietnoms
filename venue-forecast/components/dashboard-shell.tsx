import { DashboardNav } from "./dashboard-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#111]">
      <DashboardNav />
      <main>{children}</main>
    </div>
  );
}
