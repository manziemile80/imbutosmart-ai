import { useState, type FormEvent } from "react";
import { KeyRound, LogIn, LogOut, ShieldCheck, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/callout";
import { dashboardCopy } from "@/lib/agronomist-dashboard";
import type { AgronomistAuth } from "@/hooks/use-agronomist-auth";
import type { FarmerLanguage } from "@/lib/farmer-language";

export function AuthBar({ auth, language }: { auth: AgronomistAuth; language: FarmerLanguage }) {
  const t = dashboardCopy[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await auth.signIn(email, password);
    if (!result.ok) setError(result.message ?? "Sign-in failed.");
    setBusy(false);
  }

  return (
    <section
      aria-labelledby="agronomist-access-title"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary-text" aria-hidden="true" />
          <h2 id="agronomist-access-title" className="text-sm font-semibold text-foreground">
            {t.auth.title}
          </h2>
        </div>
        {auth.status === "signedIn" && (
          <StatusPill tone={auth.isAgronomist ? "success" : "warning"}>
            {auth.isAgronomist ? (
              <ShieldCheck className="size-3.5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="size-3.5" aria-hidden="true" />
            )}
            {auth.isAgronomist ? t.auth.signedInAs : t.auth.readOnly}
          </StatusPill>
        )}
      </div>

      {auth.status === "unavailable" && (
        <Callout tone="info" className="mt-3">
          {t.auth.unavailable}
        </Callout>
      )}

      {auth.status === "loading" && (
        <p className="mt-3 text-sm text-muted-foreground">{t.storage.loading}</p>
      )}

      {auth.status === "signedOut" && (
        <form
          onSubmit={onSubmit}
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="grid gap-1.5">
            <span className="field-label">{t.auth.email}</span>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1.5">
            <span className="field-label">{t.auth.password}</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <Button type="submit" className="h-9" disabled={busy || !email.trim() || !password}>
            <LogIn aria-hidden="true" />
            {busy ? t.auth.signingIn : t.auth.signIn}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-3">
            {t.auth.signedOut} {t.auth.roleHint}
          </p>
        </form>
      )}

      {auth.status === "signedIn" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground">
            {t.auth.signedInAs} <strong>{auth.name ?? auth.email}</strong>
            {auth.email && auth.name !== auth.email ? ` (${auth.email})` : ""}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void auth.signOut()}>
            <LogOut aria-hidden="true" />
            {t.auth.signOut}
          </Button>
        </div>
      )}

      {auth.status === "signedIn" && !auth.isAgronomist && (
        <Callout tone="warning" className="mt-3">
          {t.auth.notAgronomist}
        </Callout>
      )}

      {error && (
        <Callout tone="danger" role="alert" className="mt-3">
          {error}
        </Callout>
      )}
    </section>
  );
}
