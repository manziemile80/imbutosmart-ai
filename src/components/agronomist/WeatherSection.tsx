import { CloudRain, Droplets, ExternalLink, Sun, Wind } from "lucide-react";

import { Callout, StatusPill } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { districtInputs } from "@/lib/advice";
import {
  SOURCE_LINKS,
  dashboardCopy,
  forecastRisks,
  formatDateTime,
} from "@/lib/agronomist-dashboard";
import { RISK_ACTIONS } from "@/lib/agronomist-reference";
import { seasonRainMm, seasonTempC, weatherCodeLabel, type DistrictWeather } from "@/lib/weather";
import type { FarmerLanguage } from "@/lib/farmer-language";

// NISR's seasonal calendar. It is a usual pattern, not a forecast: the page
// still tells the farmer to wait for locally confirmed rain before planting.
const SEASON_WINDOWS = [
  {
    season: "A",
    label: "Season A",
    months: "September – February",
    note: "Short rainy period; the onset and amount vary by place and year.",
  },
  {
    season: "B",
    label: "Season B",
    months: "March – June",
    note: "Long rainy period; it can extend into June.",
  },
  {
    season: "C",
    label: "Season C",
    months: "July – September",
    note: "Often marshland or irrigated production; follow local water-use rules.",
  },
] as const;

export function WeatherSection({
  district,
  season,
  weather,
  loading,
  language,
}: {
  district: string;
  season: "A" | "B" | "C" | null;
  weather: DistrictWeather | null;
  loading: boolean;
  language: FarmerLanguage;
}) {
  const t = dashboardCopy[language];
  const climate = weather?.climate ?? null;
  const forecast = weather?.forecast ?? null;
  const profile = districtInputs[district] ?? null;
  const risks = forecastRisks(weather, profile?.erodedShare ?? null);
  const rainMm = climate && season ? seasonRainMm(climate, season) : null;
  const tempC = climate && season ? seasonTempC(climate, season) : null;

  return (
    <Panel aria-labelledby="agronomist-weather-title">
      <PanelHeader
        icon={<CloudRain className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.weather}
        title="Weather and climate risk"
        titleId="agronomist-weather-title"
        description="The usual season climate comes from the district's published record. The coming days come from the live forecast. Signals below are thresholds on those figures, not a risk score or a guarantee."
      />
      <PanelBody>
        {loading && <p className="text-sm text-muted-foreground">Loading the district weather…</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Usual {season ? `Season ${season}` : "season"} rain
            </p>
            <p className="mt-1 text-2xl font-semibold tabular text-foreground">
              {rainMm != null ? `${Math.round(rainMm)} mm` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {climate ? `${climate.period} record` : "District record unavailable"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Usual mean temperature
            </p>
            <p className="mt-1 text-2xl font-semibold tabular text-foreground">
              {tempC != null ? `${tempC.toFixed(1)} °C` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">From the same published record</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Forecast rain, next days
            </p>
            <p className="mt-1 text-2xl font-semibold tabular text-foreground">
              {forecast
                ? `${Math.round(forecast.days.reduce((total, day) => total + day.rainMm, 0))} mm`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {forecast ? `Issued ${formatDateTime(forecast.issuedAt)}` : "Forecast unavailable"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              District erosion indicator
            </p>
            <p className="mt-1 text-2xl font-semibold tabular text-foreground">
              {profile ? `${Math.round(profile.erodedShare * 100)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile ? "Of surveyed segments, NISR" : "Survey profile unavailable"}
            </p>
          </div>
        </div>

        <section
          aria-labelledby="planting-window-title"
          className="mt-5 rounded-xl border border-border bg-muted/30 p-4"
        >
          <h3 id="planting-window-title" className="text-sm font-semibold text-foreground">
            Usual planting windows
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {SEASON_WINDOWS.map((item) => (
              <div key={item.season} className="rounded-lg border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  {season === item.season && <StatusPill tone="neutral">Current season</StatusPill>}
                </div>
                <p className="mt-1 text-xs text-foreground">{item.months}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {item.note}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            This is the NISR seasonal calendar, not a forecast. Wait for locally confirmed rain
            before rain-fed planting, and check the coming-days forecast for this district.
          </p>
        </section>

        {climate && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t.common.source}: {climate.source} ({climate.period}). {climate.note}{" "}
            <a
              className="link-quiet inline-flex items-center gap-1"
              href={climate.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
              Open the source
            </a>
          </p>
        )}

        <section
          aria-labelledby="weather-signals-title"
          className="mt-6 border-t border-border pt-5"
        >
          <h3 id="weather-signals-title" className="text-sm font-semibold text-foreground">
            Signals to check
          </h3>
          {!forecast ? (
            <Callout tone="info" className="mt-3">
              The live forecast is not available right now. The district's usual climate is still
              shown above; no forecast figure has been estimated.
            </Callout>
          ) : risks.length === 0 ? (
            <Callout tone="success" className="mt-3">
              No heavy-rain, dry-week, heat or erosion signal is triggered by the current forecast
              thresholds. That is not a guarantee of good weather.
            </Callout>
          ) : (
            <ul className="mt-3 grid gap-3">
              {risks.map((risk) => (
                <li key={risk.kind} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{risk.title}</h4>
                    <StatusPill tone="warning">
                      {risk.kind === "heavy-rain" ? (
                        <CloudRain className="size-3.5" aria-hidden="true" />
                      ) : risk.kind === "dry-week" ? (
                        <Sun className="size-3.5" aria-hidden="true" />
                      ) : risk.kind === "erosion" ? (
                        <Wind className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Droplets className="size-3.5" aria-hidden="true" />
                      )}
                      Check
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {risk.detail}
                  </p>
                  <ul className="mt-2 grid gap-1 text-xs leading-relaxed text-muted-foreground">
                    {RISK_ACTIONS[risk.kind].map((action) => (
                      <li key={action.label}>
                        <strong className="text-foreground">{action.label}: </strong>
                        {action.detail}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">{risk.source}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {forecast && (
          <section
            aria-labelledby="forecast-days-title"
            className="mt-8 border-t border-border pt-5"
          >
            <h3 id="forecast-days-title" className="text-sm font-semibold text-foreground">
              Coming days
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Day</th>
                    <th className="py-2 pr-3 font-medium">Rain</th>
                    <th className="py-2 pr-3 font-medium">Temperature</th>
                    <th className="py-2 pr-3 font-medium">Sky</th>
                    <th className="py-2 font-medium">Rain likely</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.days.map((day) => (
                    <tr key={day.date} className="border-t border-border">
                      <td className="py-2 pr-3 tabular text-foreground">{day.date}</td>
                      <td className="py-2 pr-3 tabular text-foreground">
                        {Math.round(day.rainMm)} mm
                      </td>
                      <td className="py-2 pr-3 tabular text-foreground">
                        {Math.round(day.tempMinC)}–{Math.round(day.tempMaxC)} °C
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {weatherCodeLabel(day.weatherCode, language) ?? "—"}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {day.rainWindow ? `${day.rainWindow.from}–${day.rainWindow.to}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {t.common.source}: {forecast.source}.{" "}
              <a
                className="link-quiet inline-flex items-center gap-1"
                href={forecast.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
                Open the forecast source
              </a>{" "}
              — {SOURCE_LINKS.forecast.label}.
            </p>
          </section>
        )}
      </PanelBody>
    </Panel>
  );
}
