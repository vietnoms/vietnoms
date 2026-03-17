import { MobileCartBar } from "@/components/order/mobile-cart-bar";

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <MobileCartBar />
    </>
  );
}
