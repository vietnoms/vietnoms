import Link from "next/link";
import { Button } from "@/components/ui/button";

export function OrderingCallout() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-r from-red-700 via-brand-red to-red-700 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-glow-red">
          Order Online for Pickup
        </h2>
        <p className="mt-4 text-lg text-red-100 max-w-xl mx-auto">
          Skip the wait. Order your favorite Vietnamese dishes online and pick
          them up fresh and ready.
        </p>
        <Button
          asChild
          size="xl"
          className="mt-8 bg-white text-brand-red hover:bg-gray-100"
        >
          <Link href="/order">Start Your Order</Link>
        </Button>
      </div>
    </section>
  );
}
