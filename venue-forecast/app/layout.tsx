import type { Metadata } from "next";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: config.appName,
  description: "Event-driven sales forecasting for restaurants.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
