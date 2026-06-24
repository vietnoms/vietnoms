"use client";

import { useState, useEffect } from "react";

/**
 * True when the viewport is at Tailwind's `lg` breakpoint (1024px) or wider.
 * Defaults to false until mounted, so it is SSR-safe.
 *
 * Used to mount exactly one checkout panel — the desktop sidebar OR the mobile
 * drawer, never both. The Square Web Payments SDK attaches its inputs to fixed
 * container ids (`#rswps-card-container`, etc.), so two mounted panels would
 * both attach into the first container and duplicate the card/wallet fields.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
