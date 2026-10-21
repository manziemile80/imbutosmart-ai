// Browser-safe theme helpers. The design system defines a full dark palette in
// styles.css; this module decides which one is in force and keeps the choice
// for the next visit.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "imbutosmart-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

// The farmer's own choice, if they have made one.
export function storedTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // A browser that blocks storage still gets the right theme for this visit.
    return null;
  }
}

export function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Nothing to do: the theme still applies for this visit.
  }
}

// Without a stored choice the app follows the device, which is what a farmer
// expects at night in the field.
export function prefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export function resolveTheme(stored: Theme | null): Theme {
  return stored ?? (prefersDark() ? "dark" : "light");
}

// The class the stylesheet keys the dark palette off.
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
