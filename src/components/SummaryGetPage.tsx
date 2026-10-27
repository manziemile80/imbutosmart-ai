import { useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { FieldLink } from "@/components/FieldLink";
import { PlanSummaryBody } from "@/components/PlanSummaryBody";
import { SiteShell } from "@/components/SiteShell";
import { useField } from "@/lib/field";
import {
  buildPlanDownload,
  buildPlanSummary,
  savePlanDownload,
  summaryCopy,
} from "@/lib/plan-summary";
import { engineInput } from "@/lib/recommendation";
import { recommendOffline } from "@/lib/recommendation-engine";
import { districtInputs } from "@/lib/advice";
import { seasonRainMm, seasonTempC } from "@/lib/weather";
import { useDistrictWeather } from "@/hooks/use-district-weather";

// File is where the whole plan lives: every section in one place, ready
// to read and to keep as a PDF. The bell only carries announcements and points
// back here; the field controls stay on the Farmer page.

export function SummaryGetPage() {
  // The field and the language belong to the app, so this page reads them and
  // points back to the Farmer page for the field controls.
  const { field, language } = useField();
  const { district, soil, season } = field;
  const t = summaryCopy[language];

  const [downloadState, setDownloadState] = useState<"idle" | "saved" | "failed">("idle");

  const { weather } = useDistrictWeather(district);
  const climate = weather?.climate ?? null;
  const profile = districtInputs[district] ?? null;

  const rainMm = climate && season ? seasonRainMm(climate, season) : null;
  const tempC = climate && season ? seasonTempC(climate, season) : null;

  const summary = useMemo(() => {
    const crops = recommendOffline(
      engineInput({ district, soil, language, season, rainfallMm: rainMm, temperatureC: tempC }),
    );
    return buildPlanSummary({
      district,
      soil,
      season,
      crops: [crops.primary, ...crops.alternatives].slice(0, 3).map((crop) => ({
        crop: crop.crop,
        score: crop.score,
      })),
      profile: profile ?? null,
      climate: rainMm != null && tempC != null ? { rainMm, tempC } : null,
      language,
    });
  }, [district, soil, season, rainMm, tempC, profile, language]);

  // A new field is a new summary, so the download note starts again.
  useEffect(() => {
    setDownloadState("idle");
  }, [summary]);

  // The whole summary becomes a PDF the farmer keeps on their device. It holds
  // every section shown here, so nothing is left out of the file.
  function downloadSummary() {
    const file = buildPlanDownload({ summary, district, soil, season, language });
    setDownloadState(savePlanDownload(file) ? "saved" : "failed");
  }

  const note =
    downloadState === "failed" ? t.downloadFailed : downloadState === "saved" ? t.downloaded : "";
  const noteFailed = downloadState === "failed";

  return (
    <SiteShell>
      <div lang={language} className="page">
        <header className="page-header">
          <div className="min-w-0">
            <p className="eyebrow">{t.pageEyebrow}</p>
            <h1 className="page-title mt-2">{t.pageTitle}</h1>
            <p className="page-lede">{t.pageLede}</p>
            <div className="mt-3">
              <FieldLink />
            </div>
          </div>
        </header>

        <div className="page-section">
          <Panel aria-labelledby="summary-content-title">
            <PanelHeader
              icon={<FileText className="size-5" aria-hidden="true" />}
              eyebrow={district}
              title={t.title}
              titleId="summary-content-title"
              description={t.intro}
            />
            <PanelBody>
              <PlanSummaryBody summary={summary} language={language} />

              <div className="mt-6 border-t border-border pt-5">
                <Button type="button" className="h-11" onClick={downloadSummary}>
                  <Download aria-hidden="true" />
                  {t.download}
                </Button>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t.downloadNote}
                </p>

                <p
                  role={noteFailed ? "alert" : "status"}
                  aria-live="polite"
                  className={
                    note
                      ? noteFailed
                        ? "mt-3 text-xs leading-relaxed text-destructive"
                        : "mt-3 text-xs leading-relaxed text-muted-foreground"
                      : "sr-only"
                  }
                >
                  {note}
                </p>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}
