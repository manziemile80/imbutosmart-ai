import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Sprout, Volume2, BookOpen, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/SiteShell";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { adviceCopy, districtInputs, explainInput } from "@/lib/advice";
import { buildPlanSummary } from "@/lib/plan-summary";
import { PlanNotification } from "@/components/PlanNotification";
import { getAdvice } from "@/lib/advice.functions";
import { DISTRICTS, SOILS } from "@/lib/api";
import { farmerCopy, soilLabel, type FarmerLanguage } from "@/lib/farmer-language";
import { knowledgeCropLabel } from "@/lib/crop-knowledge";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { seasonForMonth, seasonRainMm, seasonTempC, weatherCodeLabel } from "@/lib/weather";
import { useDistrictWeather } from "@/hooks/use-district-weather";
import { useField } from "@/lib/field";
import { useVoice } from "@/hooks/use-voice";

export const Route = createFileRoute("/advice")({
  head: () => ({
    meta: [
      { title: "Farming advice — ImbutoSmart AI" },
      {
        name: "description",
        content:
          "Advice you can follow: which crops suit your district and soil, which inputs farmers around you use, and when to act.",
      },
    ],
  }),
  component: Advice,
});

function Advice() {
  const { field, setField } = useField();
  const { district, soil, season } = field;
  const [language, setLanguage] = useState<FarmerLanguage>("en");
  const t = adviceCopy[language];
  const ft = farmerCopy[language];

  const ask = useServerFn(getAdvice);
  const [plan, setPlan] = useState("");
  const [simple, setSimple] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"unconfigured" | "failed" | "empty" | null>(null);
  const voice = useVoice(language, () => {});

  const { weather, loading: weatherLoading } = useDistrictWeather(district);
  const climate = weather?.climate ?? null;
  const forecast = weather?.forecast ?? null;
  const profile = districtInputs[district] ?? null;

  // The crops that suit this field, from the agronomic knowledge base.
  const rainMm = climate && season ? seasonRainMm(climate, season) : null;
  const tempC = climate && season ? seasonTempC(climate, season) : null;
  const crops = useMemo(() => {
    const result = recommendOffline(
      engineInput({
        district,
        soil,
        language,
        season,
        rainfallMm: rainMm,
        temperatureC: tempC,
      }),
    );
    return [result.primary, ...result.alternatives];
  }, [district, soil, season, rainMm, tempC, language]);

  useEffect(() => {
    setPlan("");
    setSimple("");
    setError(null);
  }, [district, soil, season, language]);

  async function writePlan(mode: "plan" | "simple") {
    setLoading(true);
    setError(null);
    try {
      const response = await ask({ data: { district, soil, season, language, mode } });
      if (response.error) {
        setError(response.error);
      } else if (mode === "simple") {
        setSimple(response.answer);
      } else {
        setPlan(response.answer);
      }
    } catch (caught) {
      console.error("[advice] call failed", caught);
      setError("failed");
    } finally {
      setLoading(false);
    }
  }

  const inputs = [
    ...Object.entries(profile?.inorganic ?? {})
      .slice(0, 3)
      .map(([name, share]) => ({ name, share, kind: "mineral" })),
    ...Object.entries(profile?.organic ?? {})
      .slice(0, 3)
      .map(([name, share]) => ({ name, share, kind: "organic" })),
  ];

  // The overview the farmer gets as soon as the field is chosen.
  const summary = buildPlanSummary({
    district,
    soil,
    season,
    crops: crops.map((crop) => ({ crop: crop.crop, score: crop.score })),
    profile: profile ?? null,
    climate: rainMm != null && tempC != null ? { rainMm, tempC } : null,
    language,
  });

  return (
    <SiteShell language={language}>
      <div lang={language} className="page">
        <header className="page-header">
          <div className="min-w-0">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="page-title mt-2">{t.title}</h1>
            <p className="page-lede">{t.lede}</p>
          </div>
          <label className="grid gap-1.5 sm:w-56">
            <span className="field-label">{ft.language}</span>
            <select
              className="field"
              aria-label="Language / Ururimi / Langue"
              value={language}
              onChange={(event) =>
                setLanguage(
                  event.target.value === "fr" ? "fr" : event.target.value === "rw" ? "rw" : "en",
                )
              }
            >
              <option value="en">English</option>
              <option value="rw">Kinyarwanda</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </header>

        <div className="page-section">
          <PlanNotification summary={summary} district={district} soil={soil} language={language} />
        </div>

        <div className="page-section grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Panel aria-labelledby="advice-field-title">
            <PanelHeader
              icon={<Sprout className="size-5" aria-hidden="true" />}
              eyebrow={t.eyebrow}
              title={t.fieldTitle}
              titleId="advice-field-title"
            />
            <PanelBody>
              <div className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="field-label">{ft.district}</span>
                  <select
                    className="field"
                    value={district}
                    onChange={(e) => setField({ district: e.target.value })}
                  >
                    {DISTRICTS.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="field-label">{ft.soil}</span>
                  <select
                    className="field"
                    value={soil}
                    onChange={(e) => setField({ soil: e.target.value })}
                  >
                    {SOILS.map((name) => (
                      <option key={name} value={name}>
                        {soilLabel(name, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="field-label">{ft.farming}</span>
                  <select
                    className="field"
                    value={season ?? ""}
                    onChange={(e) =>
                      setField({
                        season: e.target.value === "" ? null : (e.target.value as "A" | "B" | "C"),
                      })
                    }
                  >
                    <option value="">—</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </label>
              </div>

              {profile && (
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {profile.segments} segments in the 2025 survey for {district}.
                </p>
              )}
            </PanelBody>
          </Panel>

          <Panel aria-labelledby="advice-plan-title">
            <PanelHeader
              icon={<Sparkles className="size-5" aria-hidden="true" />}
              eyebrow={t.eyebrow}
              title={t.planTitle}
              titleId="advice-plan-title"
            />
            <PanelBody>
              <section>
                <h3 className="text-sm font-semibold text-foreground">{t.cropsTitle}</h3>
                <ul className="mt-3 grid gap-2">
                  {crops.map((crop) => (
                    <li
                      key={crop.crop}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-muted/40 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {knowledgeCropLabel(crop.crop, language)}
                      </span>
                      <span className="tabular text-sm text-muted-foreground">{crop.score}%</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">{t.inputsTitle}</h3>
                {inputs.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t.noInputs}</p>
                ) : (
                  <>
                    <ul className="mt-3 grid gap-2">
                      {inputs.map((input) => (
                        <li
                          key={input.name}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
                        >
                          <span className="text-foreground">{input.name}</span>
                          <span className="tabular text-muted-foreground">
                            {Math.round(input.share * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {profile
                        ? `${Math.round(profile.usedShare * 100)}% used any fertiliser; ${Math.round(profile.irrigatedShare * 100)}% irrigated.`
                        : ""}
                    </p>
                  </>
                )}
              </section>

              <section className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">{t.whenTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {climate && season
                    ? `${district}: ${Math.round(seasonRainMm(climate, season))} mm rain and ${(seasonTempC(climate, season) ?? 0).toFixed(1)} °C are usual for this season.`
                    : t.noInputs}
                </p>
                {forecast && (
                  <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    {forecast.days.slice(0, 3).map((day) => {
                      const sky = weatherCodeLabel(day.weatherCode, language);
                      return (
                        <li key={day.date} className="flex flex-wrap gap-x-2">
                          <span className="tabular">
                            {day.date.slice(8, 10)} {day.date.slice(5, 7)} ·{" "}
                            {Math.round(day.rainMm)} mm · {Math.round(day.tempMinC)}–
                            {Math.round(day.tempMaxC)} °C
                          </span>
                          {sky && <span>{sky}</span>}
                          {day.rainWindow && (
                            <span className="text-primary-text">
                              {day.rainWindow.from}–{day.rainWindow.to}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">{t.writtenPlan}</h3>
                {plan ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {plan}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {loading ? t.writingPlan : ""}
                  </p>
                )}
                {error && (
                  <Callout tone="danger" role="alert" className="mt-3">
                    {t.errors[error]}
                  </Callout>
                )}
                <Button
                  type="button"
                  className="mt-4 h-11 w-full"
                  disabled={loading}
                  onClick={() => void writePlan("plan")}
                >
                  {loading ? (
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkles aria-hidden="true" />
                  )}
                  {loading ? t.writingPlan : t.writtenPlan}
                </Button>
              </section>
            </PanelBody>
          </Panel>
        </div>

        <div className="page-section">
          <Panel aria-labelledby="advice-assistance-title" data-testid="advice-assistance">
            <PanelHeader
              icon={<BookOpen className="size-5" aria-hidden="true" />}
              eyebrow={t.eyebrow}
              title={t.assistanceTitle}
              titleId="advice-assistance-title"
              description={t.assistanceIntro}
            />
            <PanelBody>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={!plan || voice.status === "speaking"}
                  onClick={() =>
                    voice.status === "speaking" ? voice.stopSpeaking() : void voice.speakText(plan)
                  }
                >
                  <Volume2 aria-hidden="true" />
                  {voice.status === "speaking" ? t.stop : t.listen}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={loading}
                  onClick={() => void writePlan("simple")}
                >
                  {loading ? (
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkles aria-hidden="true" />
                  )}
                  {t.simple}
                </Button>
              </div>

              {simple && (
                <div className="mt-4 rounded-xl border border-border bg-accent/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.simpleTitle}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {simple}
                  </p>
                </div>
              )}

              {inputs.length > 0 && (
                <section className="mt-6 border-t border-border pt-5">
                  <h3 className="text-sm font-semibold text-foreground">{t.glossaryTitle}</h3>
                  <dl className="mt-3 grid gap-3">
                    {inputs.map((input) => {
                      const explanation = explainInput(input.name, language);
                      if (!explanation) return null;
                      return (
                        <div key={input.name}>
                          <dt className="text-sm font-medium text-foreground">{input.name}</dt>
                          <dd className="text-sm leading-relaxed text-muted-foreground">
                            {explanation}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              )}

              <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                {t.disclaimer}
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
