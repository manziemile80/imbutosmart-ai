import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { farmerCopy, type FarmerLanguage } from "@/lib/farmer-language";

export function SiteShell({ children, language = "en" }: { children: ReactNode; language?: FarmerLanguage }) {
  const t = farmerCopy[language];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="font-display text-xl text-foreground">
            Sow<span className="text-primary">Smart</span> Rwanda
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link to="/" className="nav-link" activeOptions={{ exact: true }} activeProps={{ className: "nav-link-active" }}>{t.farmer}</Link>
            <Link to="/dashboard" className="nav-link" activeProps={{ className: "nav-link-active" }}>{t.agronomist}</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-muted">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">{t.disclosure}:</strong> {t.disclosureText}
          <div className="mt-2">NISR 2026 Big Data Hackathon</div>
        </div>
      </footer>
    </div>
  );
}
