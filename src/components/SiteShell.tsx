import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-xl text-foreground">
            Sow<span className="text-primary">Smart</span> Rwanda
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link to="/" className="nav-link" activeOptions={{ exact: true }} activeProps={{ className: "nav-link-active" }}>Farmer</Link>
            <Link to="/dashboard" className="nav-link" activeProps={{ className: "nav-link-active" }}>Agronomist</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-muted">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">AI Disclosure:</strong> AI assistants (Codex) were used to architect the ML
          pipeline, generate UI components, and debug code. The core data strategy, NISR data preprocessing logic, and
          system design were implemented by the team.
          <div className="mt-2">NISR 2026 Big Data Hackathon</div>
        </div>
      </footer>
    </div>
  );
}
