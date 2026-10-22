import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CloudSun, MessageCircleQuestion, Mic, Sprout, Lightbulb } from "lucide-react";

import { SiteShell } from "@/components/SiteShell";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { FarmerAssistant } from "@/components/FarmerAssistant";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { SeasonAssistant } from "@/components/SeasonAssistant";
import { guidanceCopy, type GuidanceMode } from "@/lib/guidance";
import { DISTRICTS, SOILS } from "@/lib/api";
import { farmerCopy, soilLabel, type FarmerLanguage } from "@/lib/farmer-language";
import { knowledgeCropLabel } from "@/lib/crop-knowledge";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { districtInputs } from "@/lib/advice";
import { buildPlanSummary } from "@/lib/plan-summary";
import { PlanNotification } from "@/components/PlanNotification";
import { seasonForMonth, seasonRainMm, seasonTempC } from "@/lib/weather";
import { useDistrictWeather } from "@/hooks/use-district-weather";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<GuidanceMode, typeof MessageCircleQuestion> = {
  question: MessageCircleQuestion,
  voice: Mic,
  season: CloudSun,
  plan: Sprout,
};

export function Guidance() {
  const [language, setLanguage] = useState<FarmerLanguage>("en");
  const [mode, setMode] = useState<GuidanceMode>("question");
  const [district, setDistrict] = useState("Musanze");
  const [soil, setSoil] = useState("Volcanic");
  const t = guidanceCopy[language];
  const ft = farmerCopy[language];
  const season = seasonForMonth(new Date().getMonth() + 1);
  const { weather } = useDistrictWeather(district);
  const climate = weather?.climate ?? null;
  const profile = districtInputs[district] ?? null;

  const crops = recommendOffline(
    engineInput({
      district,
      soil,
      language,
      season,
      rainfallMm: climate && season ? seasonRainMm(climate, season) : null,
      temperatureC: climate && season ? seasonTempC(climate, season) : null,
    }),
  );
  const summary = buildPlanSummary({
    district,
    soil,
    season,
    crops: [crops.primary, ...crops.alternatives]
      .slice(0, 3)
      .map((crop) => ({ crop: crop.crop, score: crop.score })),
    profile: profile ?? null,
    climate:
      climate && season
        ? { rainMm: seasonRainMm(climate, season), tempC: seasonTempC(climate, season) ?? 0 }
        : null,
    language,
  });

  const topInputs = [
    ...Object.entries(profile?.inorganic ?? {})
      .slice(0, 2)
      .map(([name, share]) => ({ name, share })),
    ...Object.entries(profile?.organic ?? {})
      .slice(0, 1)
      .map(([name, share]) => ({ name, share })),
  ];

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

        {/* One place, four plain ways to get help. */}
        <div className="page-section">
          <div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            role="group"
            aria-label={t.eyebrow}
          >
            {(["question", "voice", "season", "plan"] as GuidanceMode[]).map((option) => {
              const Icon = MODE_ICONS[option];
              const selected = mode === option;
              return (
                <button
                  key={option}
                  type="button"
                  data-testid={`guidance-mode-${option}`}
                  aria-pressed={selected}
                  onClick={() => setMode(option)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-accent/50 shadow-card"
                      : "border-border bg-card hover:border-border-strong hover:bg-muted/50",
                  )}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary-text">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {t.modes[option].label}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {t.modes[option].blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="page-section grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            {mode === "question" && (
              <FarmerAssistant district={district} soil={soil} language={language} />
            )}
            {mode === "voice" && (
              <VoiceAssistant district={district} soil={soil} language={language} />
            )}
            {mode === "season" && (
              <SeasonAssistant
                key={`${district}-${language}`}
                district={district}
                language={language}
              />
            )}
            {mode === "plan" && (
              <>
                <PlanNotification
                  summary={summary}
                  district={district}
                  soil={soil}
                  language={language}
                />
                <Panel
                  aria-labelledby="guidance-plan-title"
                  data-testid="guidance-plan"
                  className="mt-6"
                >
                  <PanelHeader
                    icon={<Sprout className="size-5" aria-hidden="true" />}
                    eyebrow={t.eyebrow}
                    title={t.modes.plan.label}
                    titleId="guidance-plan-title"
                    description={t.planBlurb}
                  />
                  <PanelBody>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <Stat label={ft.district} value={district} hint={soilLabel(soil, language)} />
                      <Stat
                        label={ft.farming}
                        value={season ?? "—"}
                        hint={
                          climate && season
                            ? `${Math.round(seasonRainMm(climate, season))} mm · ${(seasonTempC(climate, season) ?? 0).toFixed(1)} °C`
                            : undefined
                        }
                      />
                      <Stat
                        label={ft.recommended}
                        value={knowledgeCropLabel(crops.primary.crop, language)}
                        hint={`${crops.primary.score}%`}
                      />
                    </div>

                    <h3 className="mt-6 text-sm font-semibold text-foreground">
                      {t.modes.plan.label}
                    </h3>
                    <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                      {[crops.primary, ...crops.alternatives].slice(0, 3).map((crop) => (
                        <li key={crop.crop} className="flex justify-between gap-3">
                          <span className="text-foreground">
                            {knowledgeCropLabel(crop.crop, language)}
                          </span>
                          <span className="tabular">{crop.score}%</span>
                        </li>
                      ))}
                    </ul>

                    {topInputs.length > 0 && (
                      <>
                        <h3 className="mt-5 text-sm font-semibold text-foreground">
                          {t.modes.plan.blurb}
                        </h3>
                        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                          {topInputs.map((input) => (
                            <li key={input.name} className="flex justify-between gap-3">
                              <span className="text-foreground">{input.name}</span>
                              <span className="tabular">{Math.round(input.share * 100)}%</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <Link
                      to="/advice"
                      className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      {t.planLink}
                    </Link>
                  </PanelBody>
                </Panel>
              </>
            )}
          </div>

          <div className="grid gap-6">
            <Panel aria-labelledby="guidance-field-title">
              <PanelHeader
                icon={<Sprout className="size-5" aria-hidden="true" />}
                eyebrow={t.eyebrow}
                title={t.fieldTitle}
                titleId="guidance-field-title"
              />
              <PanelBody>
                <div className="grid gap-4">
                  <label className="grid gap-1.5">
                    <span className="field-label">{ft.district}</span>
                    <select
                      className="field"
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
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
                      onChange={(event) => setSoil(event.target.value)}
                    >
                      {SOILS.map((name) => (
                        <option key={name} value={name}>
                          {soilLabel(name, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {district} · {soilLabel(soil, language)}
                </p>
              </PanelBody>
            </Panel>

            <Panel aria-labelledby="guidance-guide-title" data-testid="guidance-guide">
              <PanelHeader
                icon={<Lightbulb className="size-5" aria-hidden="true" />}
                eyebrow={t.eyebrow}
                title={t.guideTitle}
                titleId="guidance-guide-title"
              />
              <PanelBody>
                <ol className="grid gap-3">
                  {t.guide.map((tip, index) => (
                    <li key={tip} className="flex gap-3 text-sm leading-relaxed">
                      <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary-text">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                  <BookOpen className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {ft.disclosure}: {ft.disclosureText}
                </p>
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
