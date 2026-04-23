import type { Metadata } from "next";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: config.brand.name,
  description: config.brand.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      style={
        {
          "--color-primary": config.colors.primary,
          "--color-primary-hover": config.colors.primaryHover,
        } as React.CSSProperties
      }
    >
      <body className="min-h-screen bg-surface text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
