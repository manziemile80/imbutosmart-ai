import { useCallback, useEffect, useState } from "react";

import {
  applyTheme,
  prefersDark,
  resolveTheme,
  storeTheme,
  storedTheme,
  type Theme,
} from "@/lib/theme";

// The theme the page is shown in. The first choice follows the device; once the
// farmer picks one, that choice is kept for the next visit.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(null));

  useEffect(() => {
    const stored = storedTheme();
    const initial = resolveTheme(stored);
    setThemeState(initial);
    applyTheme(initial);
    if (stored) return;

    // Follow the device while the farmer has not chosen for themselves.
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      const next: Theme = event.matches ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    storeTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return { theme, setTheme, toggleTheme, devicePrefersDark: prefersDark() };
}
