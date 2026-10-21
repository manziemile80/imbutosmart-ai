import { CloudRain, Thermometer, LoaderCircle } from "lucide-react";

import { farmerCopy, seasonName, type FarmerLanguage } from "@/lib/farmer-language";
import {
  forecastSummary,
  monthTempC,
  seasonForMonth,
  seasonRainMm,
  type DistrictWeather,
} from "@/lib/weather";

// What the district's own published record and the live forecast say. Every
// figure here comes from a named source; nothing is estimated for a farmer.
export function DistrictWeatherCard({
  weather,
  loading,
  language = "en",
}: {
  weather: DistrictWeather | null;
  loading: boolean;
  language?: FarmerLanguage;
}) {
  const t = farmerCopy[language];
  const climate = weather?.climate ?? null;
  const forecast = weather?.forecast ?? null;
  const month = new Date().getMonth() + 1;
  const season = seasonForMonth(month);

  if (!loading && !climate && !forecast) {
    return (
      <div className="card-quiet mt-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{t.weatherUnavailable}</p>
      </div>
    );
  }

  return (
    <div className="card-quiet mt-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <CloudRain className="size-3.5" aria-hidden="true" />
        {t.weatherTitle}
      </p>

      {loading && (
        <p role="status" className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {t.weatherTitle}…
        </p>
      )}

      {climate && season && (
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {t.climateTypical
            .replace("{district}", climate.district)
            .replace("{period}", climate.period)
            .replace("{season}", seasonName(language, season))
            .replace("{rain}", String(Math.round(seasonRainMm(climate, season))))
            .replace("{temp}", (monthTempC(climate, month) ?? 0).toFixed(1))}
        </p>
      )}

      {forecast && (
        <p className="mt-1.5 flex items-start gap-2 text-sm leading-relaxed text-foreground">
          <Thermometer className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
          <span>
            {t.forecastOutlook
              .replace("{days}", String(forecast.days.length))
              .replace("{source}", forecast.source)
              .replace("{rain}", String(Math.round(forecastSummary(forecast).rainMm)))
              .replace("{min}", String(Math.round(forecastSummary(forecast).tempMinC)))
              .replace("{max}", String(Math.round(forecastSummary(forecast).tempMaxC)))}
          </span>
        </p>
      )}

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {climate && (
          <>
            <a className="link-quiet" href={climate.sourceUrl} target="_blank" rel="noreferrer">
              {climate.source}
            </a>{" "}
            · {climate.note}{" "}
          </>
        )}
        {forecast && (
          <a className="link-quiet" href={forecast.sourceUrl} target="_blank" rel="noreferrer">
            {forecast.source}
          </a>
        )}
      </p>
    </div>
  );
}
