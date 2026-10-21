import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CloudRain, Sprout, LoaderCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Callout } from "@/components/ui/callout";
import { getSeasonGuide, MONTHS, seasonInputSchema } from "@/lib/season-guide";
import { AhsPrevalence } from "@/components/AhsPrevalence";
import {
  farmerCopy,
  localizedSeason,
  RW_MONTHS,
  FR_MONTHS,
  type FarmerLanguage,
} from "@/lib/farmer-language";
import { explainSeason } from "@/lib/season-assistant.functions";

export function SeasonAssistant({
  district,
  language = "en",
}: {
  district: string;
  language?: FarmerLanguage;
}) {
  const t = farmerCopy[language];
  const months = language === "rw" ? RW_MONTHS : language === "fr" ? FR_MONTHS : MONTHS;
  const [month, setMonth] = useState(10);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(explainSeason);
  const guide = localizedSeason(getSeasonGuide(month), language);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = seasonInputSchema.safeParse({ district, month, language });
    if (!parsed.success) {
      setError(t.aiUnavailable);
      return;
    }
    setLoading(true);
    setError(null);
    setAnswer("");
    try {
      const response = await ask({ data: parsed.data });
      setAnswer(response.answer);
      setError(response.error ? t.aiUnavailable : null);
    } catch {
      setError(t.aiUnavailable);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel aria-labelledby="season-assistant-title">
      <PanelHeader
        icon={<Sprout className="size-5" aria-hidden="true" />}
        eyebrow={t.assistant}
        title={t.seasons}
        titleId="season-assistant-title"
      />
      <PanelBody>
        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="field-label">{t.month}</span>
            <select
              aria-label="Season month"
              className="field"
              value={month}
              disabled={loading}
              onChange={(event) => {
                setMonth(Number(event.target.value));
                setAnswer("");
                setError(null);
              }}
            >
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <dl className="card-quiet grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="stat-label">{t.farming}</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">{guide.farming}</dd>
              <dd className="text-xs text-muted-foreground">{guide.period}</dd>
            </div>
            <div>
              <dt className="stat-label flex items-center gap-1.5">
                <CloudRain className="size-3.5" aria-hidden="true" />
                {t.typical}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-primary-text">{guide.rain}</dd>
            </div>
          </dl>

          <div>
            <p className="font-medium text-foreground">
              {guide.name} · {guide.local}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{guide.note}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.seasonNote}</p>
          </div>

          <Button type="submit" disabled={loading} className="h-12 w-full text-base">
            {loading ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Sprout aria-hidden="true" />
            )}
            {loading ? t.preparing : `${t.ask} ${months[month - 1]}`}
          </Button>
        </form>

        {loading && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            {t.preparing} {district}
          </p>
        )}

        {error && (
          <Callout tone="danger" role="alert" className="mt-4" icon={<Info aria-hidden="true" />}>
            {error}
          </Callout>
        )}

        {answer && (
          <div aria-live="polite" className="mt-5 rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              {t.advice} · {district} · {months[month - 1]}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {answer}
            </p>
          </div>
        )}

        <AhsPrevalence month={month} language={language} seasonLabel={guide.farming} />
      </PanelBody>

      <PanelFooter>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <a
            className="link-quiet"
            href="https://www.meteorwanda.gov.rw/services/climatology-of-rwanda"
            target="_blank"
            rel="noreferrer"
          >
            {t.meteo}
          </a>
          <a
            className="link-quiet"
            href="https://statistics.gov.rw/statistical-publications/agriculture-environment/seasonal-agricultural-survey-2024-annual-report-2024"
            target="_blank"
            rel="noreferrer"
          >
            {t.calendar}
          </a>
        </p>
      </PanelFooter>
    </Panel>
  );
}
