import { useState } from "react";
import { Beaker, BookOpen, ExternalLink, Landmark, Sprout } from "lucide-react";

import { Callout, StatusPill } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { districtInputs } from "@/lib/advice";
import { dashboardCopy, SOURCE_LINKS } from "@/lib/agronomist-dashboard";
import { KNOWLEDGE_GUIDES } from "@/lib/agronomist-reference";
import { findCrop, knowledgeCropLabel } from "@/lib/crop-knowledge";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { seasonRainMm, seasonTempC, type DistrictWeather } from "@/lib/weather";
import { FieldLink } from "@/components/FieldLink";
import type { SectionProps } from "./section-types";

type Props = SectionProps & {
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
  weather: DistrictWeather | null;
};

export function SoilSection({ district, soil, season, weather, ...props }: Props) {
  const t = dashboardCopy[props.language];
  const [ph, setPh] = useState("");
  const [testDate, setTestDate] = useState("");
  const [lab, setLab] = useState("");
  const profile = districtInputs[district] ?? null;
  const climate = weather?.climate ?? null;
  const rainMm = climate && season ? seasonRainMm(climate, season) : null;
  const tempC = climate && season ? seasonTempC(climate, season) : null;
  const engine = recommendOffline(
    engineInput({
      district,
      soil,
      language: props.language,
      season,
      rainfallMm: rainMm,
      temperatureC: tempC,
    }),
  );
  const crops = [engine.primary, ...engine.alternatives];
  const phValue = ph.trim() === "" ? null : Number(ph);
  const phValid = phValue == null || (Number.isFinite(phValue) && phValue >= 3 && phValue <= 10);
  const guides = KNOWLEDGE_GUIDES.filter(
    (guide) => guide.category === "soil" || guide.category === "water",
  );

  return (
    <Panel aria-labelledby="agronomist-soil-title">
      <PanelHeader
        icon={<Beaker className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.soil}
        title="Soil fertility and nutrient management"
        titleId="agronomist-soil-title"
        description="The survey gives the district's observed input use. A soil test gives the field's pH and nutrients. The app gives general guidance only: it does not invent a pH, an application rate or a lime recommendation."
        meta={<FieldLink />}
      />
      <PanelBody>
        <div className="grid gap-5 lg:grid-cols-2">
          <section
            aria-labelledby="soil-test-title"
            className="rounded-xl border border-border bg-muted/30 p-4"
          >
            <h3 id="soil-test-title" className="text-sm font-semibold text-foreground">
              A soil test, not a guess
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Enter the figures from a laboratory report. They stay on this page; the app does not
              store a pH unless an agronomist records it.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="field-label">Soil pH</span>
                <Input
                  type="number"
                  min="3"
                  max="10"
                  step="0.1"
                  value={ph}
                  onChange={(event) => setPh(event.target.value)}
                  placeholder="e.g. 5.8"
                />
                <span className="text-xs text-muted-foreground">
                  Leave blank if no test is available.
                </span>
              </label>
              <label className="grid gap-1.5">
                <span className="field-label">Date tested</span>
                <Input
                  type="date"
                  value={testDate}
                  onChange={(event) => setTestDate(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="field-label">Laboratory or source</span>
                <Input
                  value={lab}
                  onChange={(event) => setLab(event.target.value)}
                  placeholder="Name of the laboratory or agronomist"
                />
              </label>
            </div>

            {!phValid ? (
              <Callout tone="warning" className="mt-3">
                Enter a pH between 3 and 10, or leave it blank.
              </Callout>
            ) : phValue == null ? (
              <Callout tone="info" className="mt-3">
                No pH has been entered. The app will not estimate one; ask the farmer or the
                district agronomist for a soil test before changing fertiliser or lime use.
              </Callout>
            ) : (
              <div className="mt-3 grid gap-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  With pH {phValue.toFixed(1)}
                  {lab ? ` from ${lab}` : ""}
                  {testDate ? ` (tested ${testDate})` : ""}, compare the reported figure with the
                  general range of each crop below. This is not a laboratory interpretation.
                </p>
                <ul className="grid gap-1.5">
                  {crops.map((crop) => {
                    const knowledge = findCrop(crop.crop);
                    if (!knowledge) return null;
                    const [low, high] = knowledge.ph;
                    const state = phValue < low ? "below" : phValue > high ? "above" : "within";
                    return (
                      <li
                        key={crop.crop}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-foreground">
                          {knowledgeCropLabel(crop.crop, props.language)} · pH {low}–{high}
                        </span>
                        <StatusPill tone={state === "within" ? "success" : "warning"}>
                          {state === "within"
                            ? "Within the general range"
                            : state === "below"
                              ? "Below the general range"
                              : "Above the general range"}
                        </StatusPill>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  The general ranges come from the app's crop knowledge base. A laboratory report
                  and local extension advice are what decide a lime or fertiliser rate.
                </p>
              </div>
            )}
          </section>

          <section
            aria-labelledby="district-input-title"
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-primary-text" aria-hidden="true" />
              <h3 id="district-input-title" className="text-sm font-semibold text-foreground">
                What farmers in {district} reported
              </h3>
            </div>
            {profile ? (
              <>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  NISR survey aggregates for this district, not a recommendation for this field.
                  {profile.topCrop ? ` The most reported crop is ${profile.topCrop}.` : ""}
                </p>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <Row
                    label="Used any fertiliser"
                    value={`${Math.round(profile.usedShare * 100)}%`}
                  />
                  <Row label="Irrigated" value={`${Math.round(profile.irrigatedShare * 100)}%`} />
                  <Row
                    label="Eroded segments"
                    value={`${Math.round(profile.erodedShare * 100)}%`}
                  />
                  <Row label="Survey segments" value={String(profile.segments)} />
                </dl>
                {Object.keys(profile.rates).length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-medium text-foreground">
                      Observed application rates
                    </p>
                    <ul className="mt-1 grid gap-1 text-xs text-muted-foreground">
                      {Object.entries(profile.rates).map(([name, rate]) => (
                        <li key={name} className="flex justify-between gap-3">
                          <span>{name}</span>
                          <span className="tabular">{Math.round(rate)} kg/ha</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      These are rates farmers reported in the survey, not a prescription.
                    </p>
                  </>
                )}
                <a
                  className="link-quiet mt-3 inline-flex items-center gap-1 text-xs"
                  href={SOURCE_LINKS.survey.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  {SOURCE_LINKS.survey.label}
                </a>
              </>
            ) : (
              <Callout tone="info" className="mt-3">
                No district input profile is available for {district}. The app does not estimate
                one.
              </Callout>
            )}
          </section>
        </div>

        <section aria-labelledby="soil-guides-title" className="mt-8 border-t border-border pt-5">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary-text" aria-hidden="true" />
            <h3 id="soil-guides-title" className="text-sm font-semibold text-foreground">
              Soil, water and input guides
            </h3>
          </div>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {guides.map((guide) => (
              <li key={guide.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold text-foreground">{guide.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {guide.summary}
                </p>
                <ol className="mt-2 grid gap-1 text-xs leading-relaxed text-muted-foreground">
                  {guide.steps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ol>
                <p className="mt-2 text-[11px] text-muted-foreground">{guide.source}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          <Sprout className="mr-1 inline size-3.5" aria-hidden="true" />
          Verified guidance is the published survey and a laboratory report. General agronomic
          guidance is labelled as such. The app does not generate an AI soil diagnosis or a chemical
          application rate.
        </p>
      </PanelBody>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="tabular text-muted-foreground">{value}</dd>
    </div>
  );
}
