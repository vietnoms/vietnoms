import Link from "next/link";
import { RESTAURANT } from "@/lib/constants";
import { formatPhoneForTel } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="bg-brand-black text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl font-bold text-brand-red mb-3">
              Vietnoms
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Authentic Vietnamese cuisine made with fresh ingredients and
              traditional recipes. Serving San Jose since day one.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/menu", label: "Menu" },
                { href: "/order", label: "Order Online" },
                { href: "/catering", label: "Catering" },
                { href: "/gift-cards", label: "Gift Cards" },
                { href: "/about", label: "About Us" },
                { href: "/gallery", label: "Gallery" },
                { href: "/blog", label: "Blog" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Hours
            </h4>
            <ul className="space-y-2">
              {RESTAURANT.hours.map((h) => (
                <li key={h.days} className="text-sm text-gray-400">
                  <span className="text-white">{h.days}</span>
                  <br />
                  {h.open} – {h.close}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Contact
            </h4>
            <address className="not-italic space-y-2 text-sm text-gray-400">
              <p>{RESTAURANT.address.full}</p>
              <p>
                <a
                  href={formatPhoneForTel(RESTAURANT.phone)}
                  className="hover:text-white transition-colors"
                >
                  {RESTAURANT.phone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${RESTAURANT.email}`}
                  className="hover:text-white transition-colors"
                >
                  {RESTAURANT.email}
                </a>
              </p>
            </address>
            <div className="flex gap-4 mt-4">
              {Object.entries(RESTAURANT.social).map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors capitalize text-sm"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Vietnoms. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
