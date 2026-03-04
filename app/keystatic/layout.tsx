import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vietnoms Admin",
};

export default function KeystaticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
