import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  ClipboardCheck,
  CloudRain,
  Sprout,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout, StatusPill } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { districtInputs } from "@/lib/advice";
import {
  RECORD_LABEL,
  SOURCE_LINKS,
  dashboardCopy,
  forecastRisks,
  formatDate,
  overviewCounts,
  recordTitle,
  recordsWereCounted,
  type DashboardTab,
} from "@/lib/agronomist-dashboard";
import type { Stats } from "@/lib/api";
import { NISR_2026B } from "@/lib/local-model";
import type { DistrictWeather } from "@/lib/weather";
import type { SectionProps } from "./section-types";

type Props = SectionProps & {
  district: string;
  soil: string;
  season: "A" | "B" | "C" | null;
  weather: DistrictWeather | null;
  weatherLoading: boolean;
  stats: Stats | null;
  onOpenTab: (tab: DashboardTab) => void;
};

function metric(value: number | null | undefined, kind: "pct" | "number" | "t-ha"): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  if (kind === "pct") return `${Math.round(value * 100)}%`;
  if (kind === "t-ha") return `${value.toFixed(2)} t/ha`;
  return new Intl.NumberFormat("en-RW").format(value);
}

export function OverviewSection({
  district,
  soil,
  season,
  weather,
  weatherLoading,
  stats,
  onOpenTab,
  ...props
}: Props) {
  const t = dashboardCopy[props.language];
  const counts = overviewCounts(props.records);
  const profile = districtInputs[district] ?? null;
  const risks = forecastRisks(weather, profile?.erodedShare ?? null);
  const national = NISR_2026B;
  const recent = props.records.slice(0, 6);
  const currentRisks = risks.length + counts.highSeverityPests;

  // A count is only a fact once the store has been read. When the table is
  // missing or unreachable the figure is shown as unknown, never as zero. While
  // the read is in flight the same dash is used, but the wording stays quiet.
  const counted = recordsWereCounted(props.storage, props.records.length);
  const loading = props.storage === "loading";
  const unavailable = props.storage === "unconfigured" || props.storage === "error";
  const risksCounted = counted && Boolean(weather?.forecast);
  const unknown = "—";
  const figure = (value: number) => (counted ? value : unknown);
  const countHint = (text: string) =>
    counted
      ? text
      : loading
        ? "Loading the count…"
        : "Not counted: the records database was not read";

  return (
    <div className="grid gap-5">
      <Panel aria-labelledby="agronomist-overview-title">
        <PanelHeader
          icon={<BarChart3 className="size-5" aria-hidden="true" />}
          eyebrow={t.tabs.overview}
          title="What is happening in this workspace"
          titleId="agronomist-overview-title"
          description="Every count below comes from the records stored for this deployment. Published figures are named with their source. Nothing is filled in when the database or a source is unavailable."
        />
        <PanelBody>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Farmers supported"
              value={figure(counts.farmers)}
              hint={countHint("Farmer profiles on record")}
            />
            <Stat
              label="Registered agronomists"
              value={figure(counts.agronomists)}
              hint={countHint("Agronomist contacts on record")}
            />
            <Stat
              label="Crop recommendations"
              value={figure(counts.recommendations)}
              hint={countHint(`${counts.pendingRecommendations} waiting for review`)}
            />
            <Stat
              label="Pending farmer requests"
              value={figure(counts.pendingRequests)}
              hint={countHint("Recommendations and open pest reports")}
            />
            <Stat
              label="Current agricultural risks"
              value={risksCounted ? currentRisks : unknown}
              hint={
                risksCounted
                  ? "Forecast signals and severe open reports"
                  : loading
                    ? "Loading the count…"
                    : "Not counted: the forecast or the records were not available"
              }
            />
          </div>

          {unavailable && (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              The five counts are not known until the records database can be read, so they are
              shown as <strong>—</strong> rather than 0. The published figures and the reference
              catalogue below are unaffected.
            </p>
          )}

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => onOpenTab("recommendations")}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 text-left transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <ClipboardCheck className="size-4 text-primary-text" aria-hidden="true" />
                {counted
                  ? `Review ${counts.pendingRecommendations} pending recommendation${
                      counts.pendingRecommendations === 1 ? "" : "s"
                    }`
                  : "Open crop advice"}
              </span>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenTab("pests")}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 text-left transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Bug className="size-4 text-primary-text" aria-hidden="true" />
                {counted ? (
                  <>
                    {counts.openPestReports} open pest report
                    {counts.openPestReports === 1 ? "" : "s"}
                    {counts.highSeverityPests > 0
                      ? ` · ${counts.highSeverityPests} high severity`
                      : ""}
                  </>
                ) : (
                  "Open pest reports"
                )}
              </span>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenTab("weather")}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 text-left transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <CloudRain className="size-4 text-primary-text" aria-hidden="true" />
                {weather?.forecast
                  ? `${risks.length} weather signal${risks.length === 1 ? "" : "s"} to check`
                  : "Open weather and climate risk"}
              </span>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>
        </PanelBody>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel aria-labelledby="overview-field-title">
          <PanelHeader
            icon={<Sprout className="size-5" aria-hidden="true" />}
            eyebrow="Field in view"
            title={`${district} · ${soil} soil${season ? ` · Season ${season}` : ""}`}
            titleId="overview-field-title"
            description={t.fieldNote}
          />
          <PanelBody>
            {profile ? (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  NISR survey aggregates for this district, not a recommendation for one field.
                  {profile.topCrop ? ` The most reported crop is ${profile.topCrop}.` : ""}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Used any fertiliser</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {Math.round(profile.usedShare * 100)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Irrigated</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {Math.round(profile.irrigatedShare * 100)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Eroded segments</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {Math.round(profile.erodedShare * 100)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Survey segments</dt>
                    <dd className="tabular font-semibold text-foreground">{profile.segments}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Source: {SOURCE_LINKS.survey.label}. {SOURCE_LINKS.survey.url}
                </p>
              </>
            ) : (
              <Callout tone="info">
                No district input profile is available for {district}. The app does not estimate
                one.
              </Callout>
            )}
            <div className="mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenTab("soil")}>
                Soil and nutrient guidance
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </PanelBody>
        </Panel>

        <Panel aria-labelledby="overview-weather-title">
          <PanelHeader
            icon={<CloudRain className="size-5" aria-hidden="true" />}
            eyebrow="Weather signals"
            title="What the forecast asks the farmer to check"
            titleId="overview-weather-title"
            description="Thresholds on the published forecast and the district survey. They are not a risk score or a guarantee."
          />
          <PanelBody>
            {weatherLoading ? (
              <p className="text-sm text-muted-foreground">Loading the district weather…</p>
            ) : risks.length === 0 ? (
              <Callout tone={weather?.forecast ? "success" : "info"}>
                {weather?.forecast
                  ? "No heavy-rain, dry-week, heat or erosion signal is triggered by the current forecast thresholds. That is not a guarantee of good weather."
                  : "The live forecast is not available right now. The district's usual climate remains available in the weather tab; no forecast figure has been estimated."}
              </Callout>
            ) : (
              <ul className="grid gap-2">
                {risks.map((risk) => (
                  <li
                    key={risk.kind}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                      {risk.title}
                    </span>
                    <span className="mt-1 block">{risk.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenTab("weather")}
              >
                Open weather and climate risk
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel aria-labelledby="overview-published-title">
        <PanelHeader
          icon={<Users className="size-5" aria-hidden="true" />}
          eyebrow="Published figures"
          title="What the survey and the trained model report"
          titleId="overview-published-title"
          description="These are national survey figures and the model report. They are not live counts from this deployment, and a missing metric is named rather than estimated."
        />
        <PanelBody>
          <div className="grid gap-5 lg:grid-cols-2">
            <section aria-labelledby="overview-national-title">
              <h3 id="overview-national-title" className="text-sm font-semibold text-foreground">
                NISR, Season B 2026
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Total land</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {national.totalLand} M ha
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Agricultural land</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {national.agriLand} M ha
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Irrigation</dt>
                  <dd className="tabular font-semibold text-foreground">13.1%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Mechanisation</dt>
                  <dd className="tabular font-semibold text-foreground">1.8%</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Source: {SOURCE_LINKS.survey.label}. National figures, not district figures.
              </p>
            </section>

            <section aria-labelledby="overview-model-title">
              <h3 id="overview-model-title" className="text-sm font-semibold text-foreground">
                Trained model report
              </h3>
              {stats ? (
                <>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Training rows</dt>
                      <dd className="tabular font-semibold text-foreground">
                        {metric(stats.metrics.rows, "number")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Test accuracy</dt>
                      <dd className="tabular font-semibold text-foreground">
                        {metric(stats.metrics.test_accuracy, "pct")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Yield R²</dt>
                      <dd className="tabular font-semibold text-foreground">
                        {stats.metrics.test_r2 == null
                          ? "Not available"
                          : stats.metrics.test_r2.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Yield MAE</dt>
                      <dd className="tabular font-semibold text-foreground">
                        {metric(stats.metrics.test_mae_t_ha, "t-ha")}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    Source: the prediction server's evaluation report. A missing metric stays
                    unavailable rather than being replaced by an estimate.
                  </p>
                </>
              ) : (
                <Callout tone="info" className="mt-3">
                  The trained-model report is unavailable until the prediction server is connected.
                  The survey figures and the app engine remain available.
                </Callout>
              )}
            </section>
          </div>
        </PanelBody>
      </Panel>

      <Panel aria-labelledby="overview-recent-title">
        <PanelHeader
          icon={<ClipboardCheck className="size-5" aria-hidden="true" />}
          eyebrow="Recent activity"
          title={counted ? `Last changes (${props.records.length} records)` : "Recent activity"}
          titleId="overview-recent-title"
          description="The most recently stored records, with who changed them. A record's author and time are kept by the database, not typed by the page."
          meta={
            <StatusPill tone={props.storage === "ready" ? "success" : "warning"}>
              {t.storageShort[props.storage]}
            </StatusPill>
          }
        />
        <PanelBody>
          {recent.length === 0 ? (
            counted ? (
              <p className="text-sm text-muted-foreground">
                No record has been stored yet. Add a farmer, a product or a recommendation and it
                will appear here.
              </p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading the stored records…</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                The records database could not be read, so no stored change can be listed here. This
                is not the same as an empty record set, and the count stays unknown until the table
                is available.
              </p>
            )
          ) : (
            <ul className="grid gap-2">
              {recent.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="min-w-0 text-sm text-foreground">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {RECORD_LABEL[record.kind].one}
                    </span>
                    <span className="mt-0.5 block truncate">
                      {recordTitle(record.kind, record.data)}
                    </span>
                  </span>
                  <span className="text-right text-[11px] text-muted-foreground">
                    {formatDate(record.updatedAt)}
                    {record.updatedByName ? ` · ${record.updatedByName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
