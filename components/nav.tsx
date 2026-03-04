"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LoginDialog } from "@/components/auth/login-dialog";
import { LoyaltyBadge } from "@/components/loyalty/loyalty-badge";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/order", label: "Order Online" },
  { href: "/catering", label: "Catering" },
  { href: "/gift-cards", label: "Gift Cards" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, setShowLogin, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-100">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-brand-red">
                Vietnoms
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex lg:items-center lg:gap-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-700 hover:text-brand-red transition-colors"
                >
                  {link.label}
                </Link>
              ))}

              {/* Auth section */}
              {!loading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-3">
                      <LoyaltyBadge />
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {user.givenName || "Account"}
                        </span>
                      </div>
                      <button
                        onClick={logout}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Sign out"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLogin(true)}
                      className="text-sm font-medium text-gray-700 hover:text-brand-red transition-colors"
                    >
                      Sign In
                    </button>
                  )}
                </>
              )}

              <Link
                href="/order"
                className="rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Order Now
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-gray-700"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile nav */}
          {mobileOpen && (
            <div className="lg:hidden border-t border-gray-100 py-4">
              <div className="flex flex-col gap-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-base font-medium text-gray-700 hover:text-brand-red transition-colors py-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Mobile auth */}
                {!loading && (
                  <>
                    {user ? (
                      <div className="flex items-center justify-between py-2 border-t border-gray-100 mt-2 pt-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {user.givenName || "Account"}
                          </span>
                          <LoyaltyBadge />
                        </div>
                        <button
                          onClick={() => { logout(); setMobileOpen(false); }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setShowLogin(true); setMobileOpen(false); }}
                        className="text-base font-medium text-gray-700 hover:text-brand-red transition-colors py-1"
                      >
                        Sign In
                      </button>
                    )}
                  </>
                )}

                <Link
                  href="/order"
                  className="mt-2 rounded-full bg-brand-red px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Order Now
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      <LoginDialog />
    </>
  );
}
