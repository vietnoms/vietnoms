import { CartProvider } from "@/lib/cart-context";

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
