import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { farmerCopy, type FarmerLanguage } from "@/lib/farmer-language";
import { useTheme } from "@/hooks/use-theme";

// A farmer reads this page early in the morning and late in the evening, so
// the page can be shown in the darker palette of the design system.
export function ThemeToggle({ language = "en" }: { language?: FarmerLanguage }) {
  const t = farmerCopy[language];
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 text-muted-foreground hover:text-foreground pointer-coarse:size-11"
      aria-label={dark ? t.switchToLight : t.switchToDark}
      title={dark ? t.switchToLight : t.switchToDark}
      onClick={toggleTheme}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
