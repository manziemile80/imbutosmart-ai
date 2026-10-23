import { CloudRain, Thermometer, LoaderCircle } from "lucide-react";

import {
  farmerCopy,
  forecastDayLabel,
  seasonName,
  type FarmerLanguage,
} from "@/lib/farmer-language";
import {
  forecastSummary,
  seasonFigures,
  seasonForMonth,
  weatherCodeLabel,
  type AgriculturalSeason,
  type DistrictWeather,
} from "@/lib/weather";

// What the district's own published record and the live forecast say. Every
// figure here comes from a named source; nothing is estimated for a farmer.
export function DistrictWeatherCard({
  weather,
  loading,
  language = "en",
  season,
}: {
  weather: DistrictWeather | null;
  loading: boolean;
  language?: FarmerLanguage;
  /** The season the farmer chose; the current month's season when omitted. */
  season?: AgriculturalSeason | null;
}) {
  const t = farmerCopy[language];
  const climate = weather?.climate ?? null;
  const forecast = weather?.forecast ?? null;
  const month = new Date().getMonth() + 1;
  const shownSeason = season === undefined ? seasonForMonth(month) : season;
  const figures = climate ? seasonFigures(climate, shownSeason, month) : null;

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

      {climate && shownSeason && figures && (
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {t.climateTypical
            .replace("{district}", climate.district)
            .replace("{period}", climate.period)
            .replace("{season}", seasonName(language, shownSeason))
            .replace("{rain}", String(Math.round(figures.rainMm ?? 0)))
            .replace("{temp}", (figures.tempC ?? 0).toFixed(1))}
        </p>
      )}

      {forecast && (
        <>
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

          {/* The next days, with the sky and the hours rain is likely: a farmer
              needs the hour, not only the day's total. */}
          <ul className="mt-2 grid gap-1">
            {forecast.days.slice(0, 3).map((day) => {
              const sky = weatherCodeLabel(day.weatherCode, language);
              return (
                <li key={day.date} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="font-medium text-foreground">
                    {forecastDayLabel(day.date, language)}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {Math.round(day.rainMm)} mm · {Math.round(day.tempMinC)}–
                    {Math.round(day.tempMaxC)} °C
                  </span>
                  {sky && <span className="text-muted-foreground">{sky}</span>}
                  {day.rainWindow && (
                    <span className="text-primary-text">
                      {t.rainLikely
                        .replace("{from}", day.rainWindow.from)
                        .replace("{to}", day.rainWindow.to)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
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
