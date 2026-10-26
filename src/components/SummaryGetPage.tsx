import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Download, FileText, LoaderCircle, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLink } from "@/components/FieldLink";
import { PlanSummaryBody } from "@/components/PlanSummaryBody";
import { SiteShell } from "@/components/SiteShell";
import { useField } from "@/lib/field";
import {
  buildPlanDownload,
  buildPlanEmail,
  buildPlanShareText,
  buildPlanSummary,
  isValidPlanEmail,
  isValidPlanName,
  readStoredPlanEmail,
  readStoredPlanName,
  savePlanDownload,
  storePlanEmail,
  storePlanName,
  summaryCopy,
} from "@/lib/plan-summary";
import { sendPlanSummaryEmail } from "@/lib/plan-summary.functions";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { districtInputs } from "@/lib/advice";
import { seasonRainMm, seasonTempC } from "@/lib/weather";
import { useDistrictWeather } from "@/hooks/use-district-weather";

// Summary get is where the whole plan lives: every section the farmer used to
// find in the bell, now with room to read it, a file to download, and the
// share and email actions beside it. The bell only announces that it is ready.

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

export function SummaryGetPage() {
  // The field and the language belong to the app, so this page reads them and
  // points back to the Farmer page for the field controls.
  const { field, language } = useField();
  const { district, soil, season } = field;
  const t = summaryCopy[language];

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "failed">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "saved" | "failed">("idle");
  const [name, setName] = useState("");
  const [nameState, setNameState] = useState<"idle" | "invalid">("idle");
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "ready" | "invalid" | "sending" | "sent">(
    "idle",
  );
  const send = useServerFn(sendPlanSummaryEmail);
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

  // A new field is a new summary, so the share and download states start again.
  useEffect(() => {
    setShareState("idle");
    setDownloadState("idle");
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

  // The whole summary becomes a text file the farmer keeps on their device.
  // It is the same text as the share sheet, so nothing is left out.
  function downloadSummary() {
    const file = buildPlanDownload({ summary, district, soil, season, language });
    setDownloadState(savePlanDownload(file) ? "saved" : "failed");
  }

  // The whole summary goes through the phone's share sheet when the browser
  // offers one, and to the clipboard when it does not. Either way the farmer
  // shares every part of the summary, not only a preview.
  async function shareSummary() {
    const text = buildPlanShareText({ summary, district, soil, season, language });
    const title = `${t.title} — ${district}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text });
        setShareState("shared");
        return;
      } catch (error) {
        // Closing the share sheet is not a failure: the page stays as it is.
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
        // A toast confirms the send even when the page has scrolled the
        // confirmation out of view.
        toast.success(t.toastSent.replace("{email}", draft.to));
        return;
      }
    } catch {
      // The mail service is not reachable from this deployment; the farmer's
      // own mail app carries the same complete summary instead.
    }

    openMailDraft(draft.href);
    setEmailState("ready");
  }

  const note =
    downloadState === "failed"
      ? t.downloadFailed
      : downloadState === "saved"
        ? t.downloaded
        : shareState === "failed"
          ? t.shareFailed
          : shareState === "shared"
            ? t.shared
            : shareState === "copied"
              ? t.copied
              : "";
  const noteFailed = downloadState === "failed" || shareState === "failed";

  return (
    <SiteShell>
      <div lang={language} className="page">
        <header className="page-header">
          <div className="min-w-0">
            <p className="eyebrow">{t.pageEyebrow}</p>
            <h1 className="page-title mt-2">{t.pageTitle}</h1>
            <p className="page-lede">{t.pageLede}</p>
            <div className="mt-3">
              <FieldLink />
            </div>
          </div>
        </header>

        <div className="page-section">
          <Panel aria-labelledby="summary-content-title">
            <PanelHeader
              icon={<FileText className="size-5" aria-hidden="true" />}
              eyebrow={district}
              title={t.title}
              titleId="summary-content-title"
              description={t.intro}
            />
            <PanelBody>
              <PlanSummaryBody summary={summary} language={language} />

              <div className="mt-6 border-t border-border pt-5">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="h-11" onClick={downloadSummary}>
                    <Download aria-hidden="true" />
                    {t.download}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => void shareSummary()}
                  >
                    {shareState === "shared" || shareState === "copied" ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Share2 aria-hidden="true" />
                    )}
                    {shareState === "shared"
                      ? t.shared
                      : shareState === "copied"
                        ? t.copied
                        : t.share}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    aria-expanded={showEmailForm}
                    aria-controls="summary-email-form"
                    onClick={() => setShowEmailForm(true)}
                  >
                    <Mail aria-hidden="true" />
                    {t.notify}
                  </Button>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t.downloadNote}
                </p>

                <p
                  role={noteFailed ? "alert" : "status"}
                  aria-live="polite"
                  className={
                    note
                      ? noteFailed
                        ? "mt-3 text-xs leading-relaxed text-destructive"
                        : "mt-3 text-xs leading-relaxed text-muted-foreground"
                      : "sr-only"
                  }
                >
                  {note}
                </p>

                {showEmailForm && (
                  <form
                    id="summary-email-form"
                    ref={emailForm}
                    noValidate
                    className="card-quiet mt-4 grid gap-3"
                    onSubmit={emailSummary}
                  >
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {t.emailTitle}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {t.emailIntro}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <label
                        htmlFor="summary-email-name"
                        className="text-xs font-medium text-foreground"
                      >
                        {t.nameLabel}
                      </label>
                      <Input
                        id="summary-email-name"
                        type="text"
                        autoComplete="name"
                        className="h-10"
                        placeholder={t.namePlaceholder}
                        value={name}
                        disabled={emailState === "sending"}
                        aria-invalid={nameState === "invalid"}
                        aria-describedby="summary-email-name-status"
                        onChange={(event) => {
                          setName(event.target.value);
                          setNameState("idle");
                          setEmailState("idle");
                        }}
                      />
                      <p
                        id="summary-email-name-status"
                        role={nameState === "invalid" ? "alert" : "status"}
                        aria-live="polite"
                        className={
                          nameState === "invalid"
                            ? "text-xs leading-relaxed text-destructive"
                            : "sr-only"
                        }
                      >
                        {nameState === "invalid" ? t.nameInvalid : ""}
                      </p>
                    </div>

                    <div className="grid gap-1.5">
                      <label
                        htmlFor="summary-email-address"
                        className="text-xs font-medium text-foreground"
                      >
                        {t.emailLabel}
                      </label>
                      <Input
                        id="summary-email-address"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        className="h-10"
                        placeholder={t.emailPlaceholder}
                        value={email}
                        disabled={emailState === "sending"}
                        aria-invalid={emailState === "invalid"}
                        aria-describedby="summary-email-hint summary-email-status"
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setEmailState("idle");
                        }}
                      />
                      <p
                        id="summary-email-hint"
                        className="text-xs leading-relaxed text-muted-foreground"
                      >
                        {t.emailHint}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="h-10 w-full"
                      disabled={emailState === "sending"}
                    >
                      {emailState === "sending" ? (
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Mail aria-hidden="true" />
                      )}
                      {emailState === "sending" ? t.emailSending : t.emailSend}
                    </Button>

                    <p
                      id="summary-email-status"
                      role={emailState === "invalid" ? "alert" : "status"}
                      aria-live="polite"
                      className={
                        emailState === "idle" || emailState === "sending"
                          ? "sr-only"
                          : emailState === "invalid"
                            ? "text-xs leading-relaxed text-destructive"
                            : "flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"
                      }
                    >
                      {emailState === "sent" && (
                        <Check
                          className="mt-0.5 size-3.5 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        {emailState === "sent"
                          ? t.emailSent.replace("{email}", email.trim())
                          : emailState === "ready"
                            ? t.emailReady.replace("{email}", email.trim())
                            : emailState === "invalid"
                              ? t.emailInvalid
                              : ""}
                      </span>
                    </p>
                  </form>
                )}
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
