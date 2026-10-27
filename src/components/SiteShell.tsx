import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { farmerCopy } from "@/lib/farmer-language";
import { useField } from "@/lib/field";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PlanSummaryMenu } from "@/components/PlanSummaryMenu";
import { SiteMenu } from "@/components/SiteMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteShell({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useField();
  const t = farmerCopy[language];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        {/* The title line: the brand, and the farmer's summary at the far end. */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pt-3.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-xl text-foreground sm:text-[1.35rem]"
          >
            <img src="/logo.svg" alt="" className="size-9 rounded-xl" width={36} height={36} />
            <span>
              Imbuto<span className="text-primary-text">Smart</span> AI
            </span>
          </Link>
          <PlanSummaryMenu />
        </div>

        {/* The navigation line, with the language and the theme at the end. */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pb-3 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <SiteMenu language={language} />
            <nav
              className="hidden flex-nowrap items-center gap-1 text-sm lg:flex"
              aria-label="Primary"
            >
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
                to="/summary"
                className="nav-link"
                activeOptions={{ exact: true }}
                activeProps={{ className: "nav-link-active" }}
              >
                {t.summaryPage}
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
                activeOptions={{ exact: true }}
                activeProps={{ className: "nav-link-active" }}
              >
                {t.agronomist}
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguagePicker language={language} onChange={setLanguage} label={t.language} />
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
