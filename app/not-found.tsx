import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-display text-6xl font-bold text-brand-red">404</h1>
        <h2 className="mt-4 font-display text-2xl font-bold text-brand-black">
          Page Not Found
        </h2>
        <p className="mt-3 text-gray-600">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It
          might have been moved or no longer exists.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/menu">View Menu</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/order">Order Online</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
