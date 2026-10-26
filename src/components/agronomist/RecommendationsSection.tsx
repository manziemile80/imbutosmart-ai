import { useState } from "react";
import { Check, ClipboardCheck, LoaderCircle, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout, StatusPill } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardCopy,
  formatDate,
  type AgronomistRecord,
  type RecommendationData,
} from "@/lib/agronomist-dashboard";
import { findCrop, knowledgeCropLabel } from "@/lib/crop-knowledge";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { seasonRainMm, seasonTempC, type DistrictWeather } from "@/lib/weather";
import { RecordMeta } from "./RecordManager";
import type { SectionProps } from "./section-types";

type Props = SectionProps & {
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
  weather: DistrictWeather | null;
  weatherLoading: boolean;
};

function statusTone(status: string): "neutral" | "success" | "warning" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "neutral";
}

export function RecommendationsSection({
  district,
  soil,
  season,
  weather,
  weatherLoading,
  ...props
}: Props) {
  const t = dashboardCopy[props.language];
  const [saving, setSaving] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

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
  const recommendations = props.records.filter((record) => record.kind === "recommendation");
  const pending = recommendations.filter((record) => record.data["status"] === "pending");
  const reviewed = recommendations.filter((record) => record.data["status"] !== "pending");

  async function saveEngine(cropIndex: number) {
    const crop = crops[cropIndex];
    if (!crop) return;
    const knowledge = findCrop(crop.crop);
    setSaving(crop.crop);
    setError(null);
    const result = await props.save(
      "recommendation",
      {
        farmerName: "",
        district,
        soil,
        season,
        crop: crop.crop,
        confidence: crop.score,
        expectedYieldTHa: null,
        benefits: [
          ...crop.factors
            .filter(
              (factor) =>
                factor.supplied && factor.weight > 0 && factor.score / factor.weight >= 0.7,
            )
            .map((factor) => `${factor.id}: matches the field information.`),
          knowledge ? `General growing period: ${knowledge.growingPeriod}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        risks: engine.missingFactors.length
          ? `Missing information: ${engine.missingFactors.join(", ")}.`
          : "No missing factor in the app engine.",
        status: "pending",
        decisionNote: "",
        source: "local-engine",
        sourceNote:
          "App suitability engine from the general knowledge base; no measured yield and no field measurement.",
      },
      null,
    );
    setSaving(null);
    if (!result.ok && !result.queued) {
      setError(result.message ?? "The recommendation could not be saved.");
    }
  }

  async function decide(record: AgronomistRecord, status: "approved" | "rejected" | "modified") {
    const data = record.data as unknown as RecommendationData;
    setSaving(record.id);
    setError(null);
    const result = await props.save(
      "recommendation",
      {
        ...data,
        status,
        decisionNote: notes[record.id]?.trim() || data.decisionNote,
      },
      record.id,
    );
    setSaving(null);
    if (!result.ok && !result.queued) {
      setError(result.message ?? "The decision could not be saved.");
    }
  }

  async function modify(record: AgronomistRecord, form: HTMLFormElement) {
    const data = record.data as unknown as RecommendationData;
    const values = new FormData(form);
    const crop = String(values.get("crop") ?? data.crop).trim();
    const confidence = Number(values.get("confidence") ?? data.confidence);
    const yieldValue = String(values.get("expectedYieldTHa") ?? "").trim();
    const note = String(values.get("decisionNote") ?? "").trim();
    setSaving(record.id);
    setError(null);
    const result = await props.save(
      "recommendation",
      {
        ...data,
        crop,
        confidence: Number.isFinite(confidence) ? Math.round(confidence) : data.confidence,
        expectedYieldTHa: yieldValue === "" ? null : Number(yieldValue),
        status: "modified",
        decisionNote: note,
        source: "agronomist",
        sourceNote: "Modified by an agronomist. The original engine score is kept in the history.",
      },
      record.id,
    );
    setSaving(null);
    if (!result.ok && !result.queued) {
      setError(result.message ?? "The change could not be saved.");
    }
  }

  return (
    <Panel aria-labelledby="agronomist-recommendations-title">
      <PanelHeader
        icon={<ClipboardCheck className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.recommendations}
        title="Review crop advice before it reaches the farmer"
        titleId="agronomist-recommendations-title"
        description="The app engine scores crops from the field, the district climate and the season. An agronomist approves, changes or rejects the result and writes why. No yield is shown unless a measured or model figure is available."
      />
      <PanelBody>
        {error && (
          <Callout tone="danger" role="alert" className="mb-4">
            {error}
          </Callout>
        )}

        <section
          aria-labelledby="engine-result-title"
          className="rounded-xl border border-border bg-muted/30 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="engine-result-title"
              className="flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <Sparkles className="size-4 text-primary-text" aria-hidden="true" />
              Current app result for {district} · {soil} soil
            </h3>
            <StatusPill tone={rainMm != null && tempC != null ? "success" : "warning"}>
              {rainMm != null && tempC != null
                ? "Climate figures available"
                : "Climate figures unavailable"}
            </StatusPill>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {season ? `Season ${season}` : "No season chosen"} ·{" "}
            {rainMm != null ? `${Math.round(rainMm)} mm usual rain` : "season rain unavailable"} ·{" "}
            {tempC != null ? `${tempC.toFixed(1)} °C usual mean` : "season temperature unavailable"}
            .
            {weatherLoading
              ? " Loading the district record…"
              : " Source: the district climate record."}
          </p>
          <ul className="mt-3 grid gap-2">
            {crops.map((crop, index) => {
              const knowledge = findCrop(crop.crop);
              return (
                <li
                  key={crop.crop}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="text-sm text-foreground">
                    {knowledgeCropLabel(crop.crop, props.language)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {crop.band} · {knowledge?.growingPeriod ?? "period not recorded"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-sm font-semibold text-foreground">
                      {crop.score}%
                    </span>
                    {props.canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={props.busy || saving === crop.crop}
                        onClick={() => void saveEngine(index)}
                      >
                        {saving === crop.crop ? (
                          <LoaderCircle
                            className="animate-spin motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                        ) : (
                          <Check aria-hidden="true" />
                        )}
                        Save for review
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            The score is a suitability estimate from the app's general knowledge base, not a
            measured probability or a guaranteed yield. The engine uses the district, soil, season,
            usual rain and usual temperature; any missing factor is named.
          </p>
        </section>

        <section
          aria-labelledby="pending-recommendations-title"
          className="mt-8 border-t border-border pt-5"
        >
          <h3 id="pending-recommendations-title" className="text-sm font-semibold text-foreground">
            Pending review ({pending.length})
          </h3>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No recommendation is waiting for a decision.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {pending.map((record) => {
                const data = record.data as unknown as RecommendationData;
                return (
                  <li key={record.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {data.crop} · {data.confidence}%
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {data.district} · {data.soil} ·{" "}
                          {data.season ? `Season ${data.season}` : "season not set"}
                          {data.farmerName ? ` · ${data.farmerName}` : ""}
                        </p>
                      </div>
                      <StatusPill tone="warning">Pending</StatusPill>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {data.benefits}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {data.risks}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Expected yield: </strong>
                      {data.expectedYieldTHa != null
                        ? `${data.expectedYieldTHa} t/ha`
                        : "not recorded — no measured or model figure is available"}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t.common.source}: {data.sourceNote || data.source} · saved{" "}
                      {formatDate(record.createdAt)}
                    </p>

                    <details className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-foreground">
                        Change the advice
                      </summary>
                      <form
                        className="mt-3 grid gap-3 sm:grid-cols-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void modify(record, event.currentTarget);
                        }}
                      >
                        <label className="grid gap-1.5">
                          <span className="field-label">Crop</span>
                          <Input name="crop" defaultValue={data.crop} />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="field-label">Suitability score (0–100)</span>
                          <Input
                            name="confidence"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            defaultValue={data.confidence}
                          />
                        </label>
                        <label className="grid gap-1.5 sm:col-span-2">
                          <span className="field-label">Expected yield (t/ha)</span>
                          <Input
                            name="expectedYieldTHa"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={data.expectedYieldTHa ?? ""}
                            placeholder="Leave blank until a measured or model figure is available"
                          />
                          <span className="text-xs leading-relaxed text-muted-foreground">
                            The app engine returns no yield. Enter one only from a measurement or a
                            named model report.
                          </span>
                        </label>
                        <label className="grid gap-1.5 sm:col-span-2">
                          <span className="field-label">Decision note</span>
                          <Textarea
                            name="decisionNote"
                            rows={3}
                            defaultValue={notes[record.id] ?? data.decisionNote}
                            onChange={(event) =>
                              setNotes((current) => ({
                                ...current,
                                [record.id]: event.target.value,
                              }))
                            }
                            placeholder="Why did you change this advice? What should the farmer do?"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={props.busy || saving === record.id}
                          >
                            {saving === record.id ? (
                              <LoaderCircle
                                className="animate-spin motion-reduce:animate-none"
                                aria-hidden="true"
                              />
                            ) : (
                              <Check aria-hidden="true" />
                            )}
                            Save a modified recommendation
                          </Button>
                        </div>
                      </form>
                    </details>

                    <label className="mt-3 grid gap-1.5">
                      <span className="field-label">Decision note for approval or rejection</span>
                      <Textarea
                        rows={2}
                        value={notes[record.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [record.id]: event.target.value }))
                        }
                        placeholder="What did you check, and why is this the right decision?"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={props.busy || saving === record.id}
                        onClick={() => void decide(record, "approved")}
                      >
                        <Check aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={props.busy || saving === record.id}
                        onClick={() => void decide(record, "rejected")}
                      >
                        <X aria-hidden="true" />
                        Reject
                      </Button>
                    </div>
                    <RecordMeta record={record} language={props.language} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="reviewed-recommendations-title"
          className="mt-8 border-t border-border pt-5"
        >
          <h3 id="reviewed-recommendations-title" className="text-sm font-semibold text-foreground">
            Reviewed ({reviewed.length})
          </h3>
          {reviewed.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No decision has been recorded yet.</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {reviewed.slice(0, 20).map((record) => {
                const data = record.data as unknown as RecommendationData;
                return (
                  <li key={record.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {data.crop} · {data.confidence}%
                      </h4>
                      <StatusPill tone={statusTone(data.status)}>{data.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {data.district} · {data.soil} ·{" "}
                      {data.season ? `Season ${data.season}` : "season not set"}
                      {data.farmerName ? ` · ${data.farmerName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <strong className="text-foreground">Expected yield: </strong>
                      {data.expectedYieldTHa != null
                        ? `${data.expectedYieldTHa} t/ha`
                        : "not recorded"}
                    </p>
                    {data.decisionNote && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        <strong className="text-foreground">Decision: </strong>
                        {data.decisionNote}
                      </p>
                    )}
                    <RecordMeta record={record} language={props.language} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PanelBody>
    </Panel>
  );
}
