import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, Check, LoaderCircle, Mail, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanSummaryBody } from "@/components/PlanSummaryBody";
import { useField } from "@/lib/field";
import {
  buildPlanEmail,
  buildPlanShareText,
  buildPlanSummary,
  isValidPlanEmail,
  isValidPlanName,
  readStoredPlanEmail,
  readStoredPlanName,
  storePlanEmail,
  storePlanName,
  summaryCopy,
} from "@/lib/plan-summary";
import { sendPlanSummaryEmail } from "@/lib/plan-summary.functions";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { districtInputs, inputName } from "@/lib/advice";
import { seasonForMonth, seasonRainMm, seasonTempC } from "@/lib/weather";
import { useDistrictWeather } from "@/hooks/use-district-weather";
import type { FarmerLanguage } from "@/lib/farmer-language";

// When the app cannot send mail itself — no provider configured, or the
// provider failed — the whole message is handed to the farmer's own mail app,
// so the summary always has a way to be sent.
function openMailDraft(href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

// The farmer's summary, in the header: the bell opens it. It follows the
// district, soil and season the farmer has chosen anywhere in the app.
export function PlanSummaryMenu({ language = "en" }: { language?: FarmerLanguage }) {
  const { field } = useField();
  const { district, soil, season } = field;
  const t = summaryCopy[language];
  const [open, setOpen] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "failed">("idle");
  const [name, setName] = useState("");
  const [nameState, setNameState] = useState<"idle" | "invalid">("idle");
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "ready" | "invalid" | "sending" | "sent">(
    "idle",
  );
  const send = useServerFn(sendPlanSummaryEmail);
  const wrapper = useRef<HTMLDivElement>(null);
  const emailForm = useRef<HTMLFormElement>(null);
  const { weather } = useDistrictWeather(district);
  const climate = weather?.climate ?? null;
  const profile = districtInputs[district] ?? null;

  const rainMm = climate && season ? seasonRainMm(climate, season) : null;
  const tempC = climate && season ? seasonTempC(climate, season) : null;

  const summary = useMemo(() => {
    const crops = recommendOffline(
      engineInput({ district, soil, language, season, rainfallMm: rainMm, temperatureC: tempC }),
    );
    return buildPlanSummary({
      district,
      soil,
      season,
      crops: [crops.primary, ...crops.alternatives].slice(0, 3).map((crop) => ({
        crop: crop.crop,
        score: crop.score,
      })),
      profile: profile ?? null,
      climate: rainMm != null && tempC != null ? { rainMm, tempC } : null,
      language,
    });
  }, [district, soil, season, rainMm, tempC, profile, language]);

  // A new field is a new summary, so the share state starts again.
  useEffect(() => {
    setShareState("idle");
    setEmailState("idle");
    setNameState("idle");
  }, [summary]);

  // The short form opens from "Send me this summary": the first field the
  // farmer needs is focused, so the keyboard is ready to type.
  useEffect(() => {
    if (!showEmailForm) return;
    emailForm.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [showEmailForm]);

  // The name and address already used on this device are offered again, so
  // the farmer does not retype them. They stay in this browser and are used
  // only to address this farmer's own summary.
  useEffect(() => {
    const storedEmail = readStoredPlanEmail();
    if (storedEmail) setEmail((current) => current || storedEmail);
    const storedName = readStoredPlanName();
    if (storedName) setName((current) => current || storedName);
  }, []);

  // The panel closes when the farmer clicks away from it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The whole summary goes through the phone's share sheet when the browser
  // offers one, and to the clipboard when it does not. Either way the farmer
  // shares every part of the notification, not only the short preview.
  async function shareSummary() {
    const text = buildPlanShareText({ summary, district, soil, season, language });
    const title = `${t.title} — ${district}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text });
        setShareState("shared");
        return;
      } catch (error) {
        // Closing the share sheet is not a failure: the panel stays as it is.
        if ((error as { name?: string } | null)?.name === "AbortError") return;
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareState("copied");
        return;
      }
    } catch {
      // The message below tells the farmer that sharing is unavailable.
    }
    setShareState("failed");
  }

  // The same complete summary, addressed to the farmer by name and sent from
  // the app when a mail service is configured. With no service — or a delivery
  // that fails — their own mail app opens with the same message, so nothing is
  // lost and the farmer is not shown a dead end.
  async function emailSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validName = isValidPlanName(name);
    const validEmail = isValidPlanEmail(email);
    setNameState(validName ? "idle" : "invalid");
    if (!validName || !validEmail) {
      setEmailState(validEmail ? "idle" : "invalid");
      return;
    }

    const draft = buildPlanEmail({
      summary,
      district,
      soil,
      season,
      language,
      to: email,
      name,
    });
    storePlanEmail(draft.to);
    storePlanName(name);
    setEmailState("sending");

    try {
      const result = await send({
        data: { name: name.trim(), email: draft.to, district, soil, season, language },
      });
      if (result.status === "sent") {
        setEmailState("sent");
        return;
      }
    } catch {
      // The mail service is not reachable from this deployment; the farmer's
      // own mail app carries the same complete summary instead.
    }

    openMailDraft(draft.href);
    setEmailState("ready");
  }

  return (
    <div className="relative" ref={wrapper}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={t.title}
        aria-expanded={open}
        title={t.title}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <BellRing aria-hidden="true" /> : <Bell aria-hidden="true" />}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          className="absolute right-0 top-full z-30 mt-2 flex max-h-[min(80vh,40rem)] w-[min(92vw,30rem)] flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-pop"
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{district}</p>
              <p className="font-display text-lg text-foreground">{t.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.intro}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-4 -mr-2 overflow-y-auto pr-2">
            <PlanSummaryBody summary={summary} language={language} />
          </div>

          <div className="mt-4 flex shrink-0 flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              onClick={() => void shareSummary()}
            >
              {shareState === "shared" || shareState === "copied" ? (
                <Check aria-hidden="true" />
              ) : (
                <Share2 aria-hidden="true" />
              )}
              {shareState === "shared" ? t.shared : shareState === "copied" ? t.copied : t.share}
            </Button>

            {shareState === "failed" && (
              <p className="text-xs leading-relaxed text-muted-foreground">{t.shareFailed}</p>
            )}

            <p role="status" aria-live="polite" className="sr-only">
              {shareState === "shared"
                ? t.shared
                : shareState === "copied"
                  ? t.copied
                  : shareState === "failed"
                    ? t.shareFailed
                    : ""}
            </p>

            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              aria-expanded={showEmailForm}
              aria-controls="plan-summary-email-form"
              onClick={() => setShowEmailForm(true)}
            >
              <Bell aria-hidden="true" />
              {t.notify}
            </Button>

            {showEmailForm && (
              <form
                id="plan-summary-email-form"
                ref={emailForm}
                noValidate
                className="mt-1 grid gap-2 border-t border-border pt-3"
                onSubmit={emailSummary}
              >
                <label htmlFor="plan-summary-name" className="text-xs font-medium text-foreground">
                  {t.nameLabel}
                </label>
                <Input
                  id="plan-summary-name"
                  type="text"
                  autoComplete="name"
                  className="h-10"
                  placeholder={t.namePlaceholder}
                  value={name}
                  disabled={emailState === "sending"}
                  aria-invalid={nameState === "invalid"}
                  aria-describedby="plan-summary-name-status"
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameState("idle");
                    setEmailState("idle");
                  }}
                />
                <p
                  id="plan-summary-name-status"
                  role={nameState === "invalid" ? "alert" : "status"}
                  aria-live="polite"
                  className={
                    nameState === "invalid" ? "text-xs leading-relaxed text-destructive" : "sr-only"
                  }
                >
                  {nameState === "invalid" ? t.nameInvalid : ""}
                </p>

                <label htmlFor="plan-summary-email" className="text-xs font-medium text-foreground">
                  {t.emailLabel}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="plan-summary-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className="h-10 flex-1"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    disabled={emailState === "sending"}
                    aria-invalid={emailState === "invalid"}
                    aria-describedby="plan-summary-email-hint plan-summary-email-status"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setEmailState("idle");
                    }}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-10 shrink-0"
                    disabled={emailState === "sending"}
                  >
                    {emailState === "sending" ? (
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Mail aria-hidden="true" />
                    )}
                    {emailState === "sending" ? t.emailSending : t.emailSend}
                  </Button>
                </div>
                <p
                  id="plan-summary-email-hint"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {t.emailHint}
                </p>
                <p
                  id="plan-summary-email-status"
                  role={emailState === "invalid" ? "alert" : "status"}
                  aria-live="polite"
                  className={
                    emailState === "idle" || emailState === "sending"
                      ? "sr-only"
                      : emailState === "invalid"
                        ? "text-xs leading-relaxed text-destructive"
                        : "text-xs leading-relaxed text-muted-foreground"
                  }
                >
                  {emailState === "sent"
                    ? t.emailSent.replace("{email}", email.trim())
                    : emailState === "ready"
                      ? t.emailReady.replace("{email}", email.trim())
                      : emailState === "invalid"
                        ? t.emailInvalid
                        : ""}
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
