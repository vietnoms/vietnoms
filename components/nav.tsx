"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  const [scrolled, setScrolled] = useState(false);
  const { user, loading, setShowLogin, logout } = useAuth();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.span
                whileHover={{ scale: 1.02 }}
                className="font-display text-2xl md:text-3xl font-bold"
              >
                <span className="text-brand-red">Viet</span>
                <span className="text-brand-yellow">noms</span>
              </motion.span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex lg:items-center lg:gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-brand-yellow group-hover:w-3/4 transition-all duration-300" />
                </Link>
              ))}

              {/* Divider */}
              <span className="mx-2 h-6 w-px bg-gray-700" />

              {/* Auth section */}
              {!loading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-3">
                      <LoyaltyBadge />
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {user.givenName || "Account"}
                        </span>
                      </div>
                      <button
                        onClick={logout}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                        aria-label="Sign out"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLogin(true)}
                      className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2"
                    >
                      Sign In
                    </button>
                  )}
                </>
              )}

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/order"
                  className="ml-2 rounded-full bg-brand-yellow text-brand-black px-6 py-2.5 text-sm font-bold hover:bg-yellow-400 hover:shadow-lg hover:shadow-brand-yellow/20 transition-all duration-300"
                >
                  Order Now
                </Link>
              </motion.div>
            </div>

            {/* Mobile menu button */}
            <motion.button
              onClick={() => setMobileOpen(!mobileOpen)}
              whileTap={{ scale: 0.95 }}
              className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </nav>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-[#0f0f0f]/98 backdrop-blur-xl border-t border-white/10 overflow-hidden"
            >
              <div className="px-4 py-6">
                <div className="flex flex-col gap-1">
                  {NAV_LINKS.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        className="block text-lg font-medium text-gray-300 hover:text-brand-yellow transition-colors py-3 border-b border-gray-800/50"
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}

                  {/* Mobile auth */}
                  {!loading && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: NAV_LINKS.length * 0.05 }}
                    >
                      {user ? (
                        <div className="flex items-center justify-between py-4 border-b border-gray-800/50">
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-brand-yellow" />
                            <span className="text-white font-medium">
                              {user.givenName || "Account"}
                            </span>
                            <LoyaltyBadge />
                          </div>
                          <button
                            onClick={() => {
                              logout();
                              setMobileOpen(false);
                            }}
                            className="text-gray-400 hover:text-white text-sm"
                          >
                            Sign Out
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setShowLogin(true);
                            setMobileOpen(false);
                          }}
                          className="block w-full text-left text-lg font-medium text-gray-300 hover:text-brand-yellow transition-colors py-3 border-b border-gray-800/50"
                        >
                          Sign In
                        </button>
                      )}
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="mt-6"
                  >
                    <Link
                      href="/order"
                      className="block w-full rounded-full bg-brand-yellow text-brand-black px-6 py-4 text-center text-lg font-bold hover:bg-yellow-400 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      Order Now
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <LoginDialog />
    </>
  );
}
