import { useState } from "react";
import { Database, ExternalLink, LoaderCircle, WifiOff } from "lucide-react";

import { SiteShell } from "@/components/SiteShell";
import { FieldLink } from "@/components/FieldLink";
import { Callout } from "@/components/ui/callout";
import { useAgronomistAuth } from "@/hooks/use-agronomist-auth";
import { useAgronomistRecords } from "@/hooks/use-agronomist-records";
import { useDistrictWeather } from "@/hooks/use-district-weather";
import {
  DASHBOARD_MIGRATION_URL,
  DASHBOARD_TABS,
  dashboardCopy,
  visibleRecords,
  type DashboardTab,
} from "@/lib/agronomist-dashboard";
import type { Stats } from "@/lib/api";
import { useField } from "@/lib/field";
import { AuthBar } from "./AuthBar";
import { AgronomistsSection } from "./AgronomistsSection";
import { CommunicationSection } from "./CommunicationSection";
import { FarmersSection } from "./FarmersSection";
import { InputsSection } from "./InputsSection";
import { InsuranceSection } from "./InsuranceSection";
import { KnowledgeSection } from "./KnowledgeSection";
import { OfflineSection } from "./OfflineSection";
import { OverviewSection } from "./OverviewSection";
import { PestsSection } from "./PestsSection";
import { RecommendationsSection } from "./RecommendationsSection";
import { ReportsSection } from "./ReportsSection";
import { SoilSection } from "./SoilSection";
import { WeatherSection } from "./WeatherSection";

// The agronomist workspace. One page, thirteen modules, all reading the field
// chosen on the Farmer page. The page shows published figures and the reference
// catalogue before sign-in; only an account with the agronomist role can change
// a record, and the server checks that role again on every write.

export function AgronomistDashboard({ stats }: { stats: Stats | null }) {
  const { field, language } = useField();
  const t = dashboardCopy[language];
  const [tab, setTab] = useState<DashboardTab>("overview");
  const auth = useAgronomistAuth();
  const records = useAgronomistRecords(auth.userId, auth.name);
  const { weather, loading: weatherLoading } = useDistrictWeather(field.district);

  // A visitor sees the reference catalogue, never a farmer's stored records,
  // even when an earlier agronomist left a copy on this device.
  const shown = visibleRecords(records.records, auth.isAgronomist);

  const sectionProps = {
    records: shown,
    storage: records.storage,
    canEdit: auth.isAgronomist,
    busy: records.busy,
    language,
    save: records.save,
    remove: records.remove,
    refresh: records.refresh,
  };

  return (
    <SiteShell>
      <div className="page">
        <header className="page-header">
          <div className="min-w-0">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="page-title mt-2">{t.title}</h1>
            <p className="page-lede">{t.lede}</p>
            <div className="mt-4">
              <FieldLink />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-foreground">
              {field.district}
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-foreground">
              {field.soil} soil
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-foreground">
              {field.season ? `Season ${field.season}` : "Season not set"}
            </span>
          </div>
        </header>

        <div className="page-section">
          <AuthBar auth={auth} language={language} />
        </div>

        {records.storage === "device" && (
          <Callout tone="info" className="page-section">
            <Database className="size-4" aria-hidden="true" />
            <div>
              <p className="text-sm text-foreground">
                <strong>Saved on this device.</strong> Records you add are kept in this browser and
                are not shared with other devices. The published figures, the forecast and the
                reference catalogue work as usual.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Shared database
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  A deployment can keep records in a shared database instead, so every agronomist
                  sees the same list.{" "}
                  <a
                    className="link-quiet inline-flex items-center gap-1"
                    href={DASHBOARD_MIGRATION_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    The dashboard migration
                  </a>{" "}
                  creates its tables. Records already on this device stay here.
                </p>
              </details>
            </div>
          </Callout>
        )}

        {records.storage === "error" && (
          <Callout tone="info" className="page-section">
            <Database className="size-4" aria-hidden="true" />
            <p className="text-sm text-foreground">
              <strong>Working from the saved copy.</strong> {t.storage.error}
            </p>
          </Callout>
        )}

        {records.pending > 0 && records.storage !== "device" && (
          <Callout tone="warning" className="page-section">
            <WifiOff className="size-4" aria-hidden="true" />
            {records.pending} change{records.pending === 1 ? "" : "s"} saved on this device{" "}
            {records.pending === 1 ? "is" : "are"} waiting for a connection. Nothing has been lost;
            use the refresh action once the connection returns.
          </Callout>
        )}

        {records.storage === "loading" && (
          <p className="page-section flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t.storage.loading}
          </p>
        )}

        {records.notice && (
          <Callout tone="info" className="page-section">
            <Database className="size-4" aria-hidden="true" />
            {records.notice}
          </Callout>
        )}

        {!auth.isAgronomist && records.records.length > shown.length && (
          <Callout tone="info" className="page-section">
            Farmer records stored on this device are hidden until an agronomist signs in. The
            reference catalogue and the published figures stay available.
          </Callout>
        )}

        <nav aria-label="Agronomist dashboard modules" className="page-section">
          <div
            role="tablist"
            aria-label="Agronomist dashboard modules"
            className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-muted/30 p-1.5"
          >
            {DASHBOARD_TABS.map((value) => {
              const selected = value === tab;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`agronomist-panel-${value}`}
                  id={`agronomist-tab-${value}`}
                  onClick={() => setTab(value)}
                  className={
                    selected
                      ? "rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                      : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  }
                >
                  {t.tabs[value]}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className="page-section"
          role="tabpanel"
          id={`agronomist-panel-${tab}`}
          aria-labelledby={`agronomist-tab-${tab}`}
          tabIndex={0}
        >
          {tab === "overview" && (
            <OverviewSection
              {...sectionProps}
              district={field.district}
              soil={field.soil}
              season={field.season}
              weather={weather}
              weatherLoading={weatherLoading}
              stats={stats}
              onOpenTab={setTab}
            />
          )}
          {tab === "inputs" && <InputsSection {...sectionProps} />}
          {tab === "agronomists" && <AgronomistsSection {...sectionProps} />}
          {tab === "farmers" && <FarmersSection {...sectionProps} onOpenTab={setTab} />}
          {tab === "recommendations" && (
            <RecommendationsSection
              {...sectionProps}
              district={field.district}
              soil={field.soil}
              season={field.season}
              weather={weather}
              weatherLoading={weatherLoading}
            />
          )}
          {tab === "soil" && (
            <SoilSection
              {...sectionProps}
              district={field.district}
              soil={field.soil}
              season={field.season}
              weather={weather}
            />
          )}
          {tab === "weather" && (
            <WeatherSection
              district={field.district}
              season={field.season}
              weather={weather}
              loading={weatherLoading}
              language={language}
            />
          )}
          {tab === "pests" && <PestsSection {...sectionProps} />}
          {tab === "insurance" && <InsuranceSection {...sectionProps} />}
          {tab === "communication" && <CommunicationSection {...sectionProps} />}
          {tab === "knowledge" && <KnowledgeSection {...sectionProps} />}
          {tab === "reports" && <ReportsSection {...sectionProps} />}
          {tab === "offline" && (
            <OfflineSection
              language={language}
              storage={records.storage}
              lastSavedAt={records.lastSavedAt}
              pending={records.pending}
              refresh={records.refresh}
              recordCount={shown.length}
              clearCache={records.clearCache}
            />
          )}
        </div>

        <footer className="page-section rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            {t.auth.roleHint} A price, premium, application rate, eligibility rule or risk score is
            shown only when an agronomist records a verified figure with its source and date; the
            app never invents one.
          </p>
          <p className="mt-2">
            {t.common.source}: NISR survey aggregates, the district climate record, the live
            forecast and the trained model report. A source that cannot be reached leaves its part
            unavailable.
          </p>
        </footer>
      </div>
    </SiteShell>
  );
}
