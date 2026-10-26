import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ClipboardList,
  FileText,
  LifeBuoy,
  Lightbulb,
  Menu,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { farmerCopy, type FarmerLanguage } from "@/lib/farmer-language";

// The header menu holds the five pages in one place for a narrow screen, where
// the link row does not fit. It is navigation only: every page still owns its
// own feature, and the active page is marked so the header says where you are.

type MenuTarget = "/" | "/advice" | "/summary" | "/guidance" | "/dashboard";

type MenuEntry = { to: MenuTarget; icon: LucideIcon; label: string };

export function SiteMenu({ language }: { language: FarmerLanguage }) {
  const t = farmerCopy[language];
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const entries: MenuEntry[] = [
    { to: "/", icon: Sprout, label: t.farmer },
    { to: "/advice", icon: Lightbulb, label: t.advicePage },
    { to: "/summary", icon: FileText, label: t.summaryPage },
    { to: "/guidance", icon: LifeBuoy, label: t.guidancePage },
    { to: "/dashboard", icon: ClipboardList, label: t.agronomist },
  ];

  // The panel closes on a click away and on Escape, and Escape returns the
  // keyboard to the trigger rather than dropping it at the top of the page.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative lg:hidden" ref={wrapper}>
      <Button
        ref={trigger}
        type="button"
        variant="outline"
        className="h-9 gap-1.5 px-3 text-sm"
        aria-expanded={open}
        aria-controls="site-menu-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Menu className="size-4" aria-hidden="true" />
        {t.menu}
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </Button>

      {open && (
        <div id="site-menu-panel" className="nav-menu-panel">
          <nav aria-label={t.menu}>
            <ul className="grid gap-0.5">
              {entries.map((entry) => {
                const Icon = entry.icon;
                return (
                  <li key={entry.to}>
                    <Link
                      to={entry.to}
                      activeOptions={{ exact: true }}
                      activeProps={{ "aria-current": "page" }}
                      className="nav-menu-item"
                      onClick={() => setOpen(false)}
                    >
                      <Icon className="nav-menu-icon" aria-hidden="true" />
                      {entry.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
