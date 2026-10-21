import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "@/components/ThemeToggle";
import { isTheme, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(cleanup);

describe("theme", () => {
  it("only accepts a real theme", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("keeps the farmer's own choice and otherwise follows the device", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    // No stored choice: the device decides.
    expect(["light", "dark"]).toContain(resolveTheme(null));
  });

  it("switches the palette and remembers the choice", () => {
    render(<ThemeToggle language="en" />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(button);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    const back = screen.getByRole("button", { name: /switch to light mode/i });
    fireEvent.click(back);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("names the action in the farmer's language", () => {
    render(<ThemeToggle language="fr" />);

    expect(screen.getByRole("button", { name: /mode sombre/i })).toBeInTheDocument();
  });
});
