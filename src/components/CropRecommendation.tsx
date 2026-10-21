import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Sprout, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout, StatusPill } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { CROP_NAMES, knowledgeCropLabel } from "@/lib/crop-knowledge";
import { recommendationCopy } from "@/lib/recommendation-copy";
import { recommendOffline } from "@/lib/recommendation-engine";
import {
  buildLocalExplanation,
  engineInput,
  recommendationInputSchema,
  type RecommendationInput,
  type RecommendationResult,
} from "@/lib/recommendation";
import { recommendCropsOnline, syncRecommendations } from "@/lib/recommendation.functions";
import { listPending, markSynced, saveRecommendation, trimOld } from "@/lib/recommendation-store";
import { soilLabel, type FarmerLanguage } from "@/lib/farmer-language";
import { useNetworkStatus } from "@/hooks/use-network";

type Props = {
  district: string;
  soil: string;
  rain: string;
  temp: string;
  language?: FarmerLanguage;
};

type SyncNote = "synced" | "saved" | "pending";

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// Implausible optional values are dropped rather than blocking the farmer:
// a missing factor is honest, a made-up one is not.
function inRange(value: number | null, min: number, max: number): number | null {
  return value != null && value >= min && value <= max ? value : null;
}

// Seasons follow the agricultural calendar used elsewhere in the app. In
// September both A and C overlap, so no season is preselected.
function defaultSeason(): "" | "A" | "B" | "C" {
  const month = new Date().getMonth() + 1;
  if (month >= 10 || month <= 2) return "A";
  if (month <= 6) return "B";
  if (month <= 8) return "C";
  return "";
}

export function CropRecommendation({ district, soil, rain, temp, language = "en" }: Props) {
  const t = recommendationCopy[language];
  const network = useNetworkStatus();
  const recommendFn = useServerFn(recommendCropsOnline);
  const syncFn = useServerFn(syncRecommendations);

  const [soilPh, setSoilPh] = useState("");
  const [landSize, setLandSize] = useState("");
  const [season, setSeason] = useState<"" | "A" | "B" | "C">("");
  const [water, setWater] = useState("");
  const [experience, setExperience] = useState("");
  const [preference, setPreference] = useState("");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [syncNote, setSyncNote] = useState<SyncNote | null>(null);
  const flushing = useRef(false);

  // Set the season after mount so server and browser markup always agree.
  useEffect(() => {
    setSeason(defaultSeason());
  }, []);

  async function flushPending() {
    if (flushing.current) return;
    flushing.current = true;
    try {
      const pending = await listPending();
      if (pending.length === 0) return;
      const response = await syncFn({
        data: {
          records: pending.slice(0, 200).map((record) => ({
            id: record.id,
            createdAt: record.createdAt,
            input: record.input,
            result: {
              crop: record.result.crop,
              score: record.result.score,
              source: record.result.source,
            },
          })),
        },
      });
      if (response.durable) {
        await markSynced(pending.map((record) => record.id));
        setSyncNote("synced");
      } else {
        // No durable target configured: the records stay safely on this device.
        setSyncNote("saved");
      }
    } catch {
      // A failed flush leaves records pending; the next reconnect retries.
    } finally {
      flushing.current = false;
    }
  }

  useEffect(() => {
    if (network.status === "online") void flushPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.status]);

  function buildInput(): RecommendationInput | null {
    const parsed = recommendationInputSchema.safeParse({
      district,
      soil,
      soilPh: inRange(numberOrNull(soilPh), 3, 10),
      landSizeHa: inRange(numberOrNull(landSize), 0.01, 1000),
      season: season || null,
      rainfallMm: inRange(numberOrNull(rain), 0, 5000),
      temperatureC: inRange(numberOrNull(temp), -5, 45),
      waterAvailability: water || null,
      experience: experience || null,
      preferredCrop: preference || null,
      language,
    });
    return parsed.success ? parsed.data : null;
  }

  function localRecommendation(input: RecommendationInput): RecommendationResult {
    return buildLocalExplanation(recommendOffline(engineInput(input)), input, input.language);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = buildInput();
    if (!input) {
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    setResult(null);
    setSyncNote(null);

    let next: RecommendationResult;
    if (network.status === "online") {
      try {
        const response = await recommendFn({ data: input });
        next = response.result ?? localRecommendation(input);
      } catch {
        // The connection may have dropped mid-request: answer from local data
        // and let the mode indicator re-check rather than showing an error.
        next = localRecommendation(input);
        network.recheck();
      }
    } else {
      next = localRecommendation(input);
    }

    setResult(next);
    setLoading(false);

    try {
      await saveRecommendation(input, next, "pending");
      await trimOld();
      setSyncNote("pending");
      if (network.status === "online") void flushPending();
    } catch {
      // Storage is best-effort; the recommendation itself is already shown.
    }
  }

  const offline = network.status === "offline";
  const inherited = `${district} · ${soilLabel(soil, language)} · ${rain} mm · ${temp} °C`;

  return (
    <Panel aria-labelledby="crop-recommendation-title" data-testid="crop-recommendation">
      <PanelHeader
        icon={<Sprout className="size-5" aria-hidden="true" />}
        title={t.form.heading}
        titleId="crop-recommendation-title"
        description={t.form.intro}
        meta={
          <StatusPill
            role="status"
            data-testid="recommendation-mode"
            tone={offline ? "warning" : "success"}
            icon={
              offline ? (
                <WifiOff className="size-3.5" aria-hidden="true" />
              ) : (
                <Wifi className="size-3.5" aria-hidden="true" />
              )
            }
          >
            {offline ? t.mode.offlineNote : t.mode.onlineNote}
          </StatusPill>
        }
      />
      <PanelBody>
        <form onSubmit={onSubmit} className="grid gap-4">
          <p className="text-xs text-muted-foreground">
            {t.form.context} <span className="font-medium text-foreground">{inherited}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="field-label">{t.form.soilPh}</span>
              <input
                className="field"
                type="number"
                inputMode="decimal"
                min={3}
                max={10}
                step={0.1}
                placeholder={t.form.phHint}
                value={soilPh}
                disabled={loading}
                onChange={(event) => setSoilPh(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{t.form.landSize}</span>
              <input
                className="field"
                type="number"
                inputMode="decimal"
                min={0.01}
                max={1000}
                step={0.01}
                placeholder={t.form.landHint}
                value={landSize}
                disabled={loading}
                onChange={(event) => setLandSize(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{t.form.season}</span>
              <select
                className="field"
                value={season}
                disabled={loading}
                onChange={(event) => setSeason(event.target.value as "" | "A" | "B" | "C")}
              >
                <option value="">{t.form.seasonAny}</option>
                <option value="A">{t.form.seasonA}</option>
                <option value="B">{t.form.seasonB}</option>
                <option value="C">{t.form.seasonC}</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{t.form.water}</span>
              <select
                className="field"
                value={water}
                disabled={loading}
                onChange={(event) => setWater(event.target.value)}
              >
                <option value="">{t.form.waterUnknown}</option>
                <option value="rainfed">{t.form.rainfed}</option>
                <option value="irrigated">{t.form.irrigated}</option>
                <option value="limited">{t.form.limited}</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{t.form.experience}</span>
              <select
                className="field"
                value={experience}
                disabled={loading}
                onChange={(event) => setExperience(event.target.value)}
              >
                <option value="">{t.form.experienceUnknown}</option>
                <option value="new">{t.form.expNew}</option>
                <option value="some">{t.form.expSome}</option>
                <option value="experienced">{t.form.expExperienced}</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">{t.form.preference}</span>
              <select
                className="field"
                value={preference}
                disabled={loading}
                onChange={(event) => setPreference(event.target.value)}
              >
                <option value="">{t.form.noPreference}</option>
                {CROP_NAMES.map((crop) => (
                  <option key={crop} value={crop}>
                    {knowledgeCropLabel(crop, language)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-14 w-full text-base sm:w-auto sm:px-8"
          >
            {loading ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Sprout aria-hidden="true" />
            )}
            {loading ? t.result.loading : t.form.submit}
          </Button>
        </form>

        {loading && (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t.result.loading}
          </p>
        )}
        {error && (
          <Callout tone="danger" role="alert" className="mt-4">
            {t.result.failed}
          </Callout>
        )}

        {result && (
          <div aria-live="polite" data-testid="hybrid-recommendation" className="result-card mt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {t.result.recommended}
                </p>
                <p className="font-display mt-1 text-2xl font-semibold text-foreground">
                  {knowledgeCropLabel(result.crop, language)}
                </p>
                <p className="mt-1 text-sm font-medium text-primary-text">
                  {t.result.band[result.band]}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-4xl font-bold text-primary-text">{result.score}%</p>
                <p className="text-xs text-muted-foreground">{t.result.score}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {result.source === "online-ai" ? t.result.onlineBadge : t.result.offlineBadge}
              </span>
            </div>

            <div className="mt-5 grid gap-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t.result.why}</h3>
                <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed">
                  {result.reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              </div>
              <dl className="grid gap-4 border-y border-border/70 py-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t.result.soilConditions}</dt>
                  <dd className="mt-1 font-medium text-foreground">{result.soilConditions}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.result.waterNeeds}</dt>
                  <dd className="mt-1 font-medium text-foreground">{result.waterNeeds}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.result.growingPeriod}</dt>
                  <dd className="mt-1 font-medium text-foreground">{result.growingPeriod}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.result.plantingSeason}</dt>
                  <dd className="mt-1 font-medium text-foreground">{result.plantingSeason}</dd>
                </div>
              </dl>
              {result.considerations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t.result.considerations}
                  </h3>
                  <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed">
                    {result.considerations.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.risks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t.result.risks}</h3>
                  <ul className="mt-2 grid gap-1.5 text-sm leading-relaxed">
                    {result.risks.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.alternatives.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t.result.alternatives}</h3>
                  <ul className="mt-2 grid gap-1.5 text-sm">
                    {result.alternatives.map((item) => (
                      <li
                        key={item.crop}
                        className="flex items-center justify-between gap-3 border-b border-border/70 pb-1.5 last:border-b-0"
                      >
                        <span>{knowledgeCropLabel(item.crop, language)}</span>
                        <span className="tabular text-muted-foreground">
                          {item.score}% · {t.result.band[item.band]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="rounded-xl border border-border bg-card/70 p-3 text-xs leading-relaxed text-muted-foreground">
                {t.result.warning}
              </p>
              {syncNote && (
                <p className="text-xs text-muted-foreground">
                  {syncNote === "synced"
                    ? t.result.synced
                    : syncNote === "saved"
                      ? t.result.savedLocal
                      : t.result.pendingSync}
                </p>
              )}
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
