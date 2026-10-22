import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import type { ReactNode } from "react";
import { farmerCopy, type FarmerLanguage } from "@/lib/farmer-language";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteShell({
  children,
  language = "en",
}: {
  children: ReactNode;
  language?: FarmerLanguage;
}) {
  const t = farmerCopy[language];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary-text">
              <Sprout className="size-5" aria-hidden="true" />
            </span>
            <span>
              Imbuto<span className="text-primary-text">Smart</span> AI
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <nav className="flex gap-1 text-sm" aria-label="Primary">
              <Link
                to="/"
                className="nav-link"
                activeOptions={{ exact: true }}
                activeProps={{ className: "nav-link-active" }}
              >
                {t.farmer}
              </Link>
              <Link
                to="/advice"
                className="nav-link"
                activeOptions={{ exact: true }}
                activeProps={{ className: "nav-link-active" }}
              >
                {t.advicePage}
              </Link>
              <Link
                to="/guidance"
                className="nav-link"
                activeOptions={{ exact: true }}
                activeProps={{ className: "nav-link-active" }}
              >
                {t.guidancePage}
              </Link>
              <Link
                to="/dashboard"
                className="nav-link"
                activeProps={{ className: "nav-link-active" }}
              >
                {t.agronomist}
              </Link>
            </nav>
            <ThemeToggle language={language} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-12 border-t border-border bg-muted">
        <div className="mx-auto max-w-6xl px-5 py-8 text-xs leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">{t.disclosure}:</strong> {t.disclosureText}
          </p>
          <p className="mt-2">NISR 2026 Big Data Hackathon</p>
        </div>
      </footer>
    </div>
  );
}
