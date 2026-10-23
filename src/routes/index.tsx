import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { SeasonAssistant } from "@/components/SeasonAssistant";
import { FarmerAssistant } from "@/components/FarmerAssistant";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { InsuranceGuidance } from "@/components/InsuranceGuidance";
import { CropRecommendation } from "@/components/CropRecommendation";
import { DistrictWeatherCard } from "@/components/DistrictWeatherCard";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Callout } from "@/components/ui/callout";
import { API_URL, DISTRICTS, SOILS } from "@/lib/api";
import {
  farmerCopy,
  cropLabel,
  seasonName,
  soilLabel,
  type FarmerLanguage,
} from "@/lib/farmer-language";
import { useAutoPrediction } from "@/hooks/use-auto-prediction";
import { useField } from "@/lib/field";
import { useDistrictWeather } from "@/hooks/use-district-weather";
import { useSeasonWeather } from "@/hooks/use-season-weather";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ImbutoSmart AI — What should I plant this season?" },
      {
        name: "description",
        content:
          "Explore Rwanda’s farming seasons, typical rainfall, and crop recommendations with ImbutoSmart AI’s season assistant.",
      },
      { property: "og:title", content: "ImbutoSmart AI — Farmer Advisory" },
      {
        property: "og:description",
        content:
          "Learn Rwanda’s season names and typical rainfall, then get crop advice for your field.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Advisory,
});

function Advisory() {
  // The district, soil and season are the app's field, so the summary in the
  // header follows whatever the farmer changes here.
  const { field, setField } = useField();
  const { district, soil, season } = field;
  const [language, setLanguage] = useState<FarmerLanguage>("en");
  const t = farmerCopy[language];
  const month = new Date().getMonth() + 1;
  const { weather, loading: weatherLoading } = useDistrictWeather(district);
  // The weather of the district the farmer is looking at now, not a previous
  // district's figures while the new record loads.
  const currentWeather = weather?.district === district ? weather : null;
  const climate = currentWeather?.climate ?? null;

  // The district's own published record fills the season figures, so they
  // follow both the location and the season the farmer chose. A figure the
  // farmer typed is kept, and can be handed back to the record.
  const { rain, temp, rainEdited, tempEdited, setRain, setTemp, useDistrictFigures } =
    useSeasonWeather(climate, season, month);

  const { result, loading, error } = useAutoPrediction(district, soil, rain, temp, season);

  // While the record is still loading, an empty field is expected rather than
  // an error the farmer can act on.
  const waitingForClimate = weatherLoading && (!rain || !temp);

  return (
    <SiteShell language={language}>
      <div lang={language} className="page">
        <header className="page-header">
          <div className="min-w-0">
            <p className="eyebrow">{t.advisory}</p>
            <h1 className="page-title mt-2">{t.title}</h1>
            <p className="page-lede">{t.intro}</p>
          </div>
          <label className="grid gap-1.5 sm:w-56">
            <span className="field-label">{t.language}</span>
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

        <div className="page-section grid items-start gap-6 lg:grid-cols-2">
          <Panel aria-labelledby="field-panel-title">
            <PanelHeader title={t.field} titleId="field-panel-title" />
            <PanelBody>
              <form onSubmit={(event) => event.preventDefault()} className="grid gap-5">
                <Field label={t.district}>
                  <select
                    className="field"
                    value={district}
                    onChange={(e) => setField({ district: e.target.value })}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t.soil}>
                  <select
                    className="field"
                    value={soil}
                    onChange={(e) => setField({ soil: e.target.value })}
                  >
                    {SOILS.map((s) => (
                      <option key={s} value={s}>
                        {soilLabel(s, language)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.farming}>
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
                    <option value="A">{seasonName(language, "A")}</option>
                    <option value="B">{seasonName(language, "B")}</option>
                    <option value="C">{seasonName(language, "C")}</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t.rain}>
                    <input
                      className="field"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={5000}
                      required
                      value={rain}
                      onChange={(e) => setRain(e.target.value)}
                    />
                  </Field>
                  <Field label={t.temp}>
                    <input
                      className="field"
                      type="number"
                      inputMode="decimal"
                      min={-5}
                      max={45}
                      step="0.1"
                      required
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                    />
                  </Field>
                </div>
                {climate && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t.weatherAuto
                      .replace("{district}", district)
                      .replace("{period}", climate.period)}
                  </p>
                )}
                {climate && (rainEdited || tempEdited) && (
                  <button
                    type="button"
                    className="link-quiet justify-self-start text-xs"
                    onClick={useDistrictFigures}
                  >
                    {t.useDistrictFigures}
                  </button>
                )}
              </form>

              <DistrictWeatherCard
                weather={currentWeather}
                loading={weatherLoading}
                language={language}
                season={season}
              />

              {loading && (
                <p role="status" className="mt-5 text-sm text-muted-foreground">
                  {t.analysing}
                </p>
              )}
              {error && !(waitingForClimate && error === "invalid") && (
                <Callout tone="danger" role="alert" className="mt-5">
                  {t[error]}
                </Callout>
              )}

              {result && (
                <div aria-live="polite" data-testid="crop-result" className="result-card mt-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {t.recommended}
                  </p>
                  <p className="font-display mt-1 break-words text-4xl leading-tight text-foreground sm:text-5xl">
                    {cropLabel(result.recommended_crop, language)}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.confidence}</p>
                      <p className="tabular mt-1 text-3xl font-semibold text-foreground">
                        {Math.round(result.confidence * 100)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.yield}</p>
                      <p className="tabular mt-1 text-3xl font-semibold text-foreground">
                        {result.expected_yield_t_ha.toFixed(1)} t/ha
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {district} · {soilLabel(soil, language)}
                    {result.observations
                      ? ` · ${t.observations.replace("{n}", String(result.observations))}`
                      : ""}
                  </p>
                  {!API_URL && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {t.localNote}
                    </p>
                  )}
                  {result.alternatives.length > 0 && (
                    <div className="mt-6 border-t border-border/70 pt-4">
                      <p className="text-sm text-muted-foreground">{t.alternatives}</p>
                      <ul className="mt-2 space-y-1">
                        {result.alternatives.map((a) => (
                          <li
                            key={a.crop}
                            className="flex flex-wrap justify-between gap-x-3 gap-y-1"
                          >
                            <span>{cropLabel(a.crop, language)}</span>
                            <span className="tabular text-muted-foreground">
                              {Math.round(a.success_probability * 100)}% ·{" "}
                              {a.expected_yield_t_ha.toFixed(1)} t/ha
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </PanelBody>
          </Panel>

          <SeasonAssistant
            key={`${district}-${language}`}
            district={district}
            language={language}
          />
        </div>

        <div className="page-section">
          <InsuranceGuidance district={district} soil={soil} language={language} />
        </div>

        <div className="page-section">
          <CropRecommendation
            district={district}
            soil={soil}
            rain={rain}
            temp={temp}
            language={language}
          />
        </div>

        <div className="page-section grid items-start gap-6 lg:grid-cols-2">
          <VoiceAssistant district={district} soil={soil} language={language} />
          <FarmerAssistant district={district} soil={soil} language={language} />
        </div>
      </div>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
