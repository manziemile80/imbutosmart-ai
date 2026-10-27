import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

// Every page in the header menu, in the order the menu shows them. Their code
// lives in its own chunk, so a page that has not been opened yet needs the
// network the first time it is visited. Warming those chunks while the app can
// still reach them means moving through the menu keeps working after the
// connection drops: Advice to Agronomist, Farmer to File, and back again.
const MENU_ROUTES = ["/", "/advice", "/summary", "/guidance", "/dashboard"] as const;

// The first page is left alone until it has painted, so the warm-up never
// competes with the screen the farmer is waiting for.
const WARMUP_DELAY_MS = 800;

export function useRouteWarmup() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const warm = () => {
      if (cancelled) return;
      // Nothing to fetch while the device is offline; the `online` event brings
      // the warm-up back.
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      for (const to of MENU_ROUTES) {
        try {
          // A page that cannot be fetched now is tried again when the
          // connection returns, so a failure stays quiet.
          void Promise.resolve(router.preloadRoute({ to })).catch(() => {});
        } catch {
          // Same as above: the menu still works for pages already in memory.
        }
      }
    };

    const timer = window.setTimeout(warm, WARMUP_DELAY_MS);
    window.addEventListener("online", warm);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("online", warm);
    };
  }, [router]);
}
