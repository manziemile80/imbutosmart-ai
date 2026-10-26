import { useState } from "react";
import { CloudOff, Database, RefreshCw, Trash2, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout, StatusPill } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { dashboardCopy, type StorageState } from "@/lib/agronomist-dashboard";
import { useNetworkStatus } from "@/hooks/use-network";
import type { FarmerLanguage } from "@/lib/farmer-language";

export function OfflineSection({
  language,
  storage,
  lastSavedAt,
  pending,
  refresh,
  recordCount,
}: {
  language: FarmerLanguage;
  storage: StorageState;
  lastSavedAt: string | null;
  pending: number;
  refresh: () => Promise<void>;
  recordCount: number;
}) {
  const t = dashboardCopy[language];
  const network = useNetworkStatus();
  const [cleared, setCleared] = useState(false);

  function clearCache() {
    try {
      window.localStorage.removeItem("imbutosmart-agronomist-records-v1");
      setCleared(true);
    } catch {
      setCleared(false);
    }
  }

  return (
    <Panel aria-labelledby="agronomist-offline-title">
      <PanelHeader
        icon={<CloudOff className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.offline}
        title="Offline access and data management"
        titleId="agronomist-offline-title"
        description="The guides and the district climate record are part of the app. A copy of the records is kept on this device after a successful load. A change made while the connection is down waits in a small queue and is sent when the page next reaches the server."
      />
      <PanelBody>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={network.status === "online" ? "success" : "warning"}>
            {network.status === "online" ? (
              <Wifi className="size-3.5" aria-hidden="true" />
            ) : (
              <CloudOff className="size-3.5" aria-hidden="true" />
            )}
            {network.status === "checking" ? "Checking connection" : network.status}
          </StatusPill>
          <StatusPill tone={storage === "ready" ? "success" : "warning"}>
            <Database className="size-3.5" aria-hidden="true" />
            {storage === "ready" ? "Records database ready" : t.storage[storage]}
          </StatusPill>
          <StatusPill tone={pending > 0 ? "warning" : "neutral"}>
            {pending} change{pending === 1 ? "" : "s"} waiting to sync
          </StatusPill>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Records in this copy
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular text-foreground">{recordCount}</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Last saved on this device
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {lastSavedAt ? new Date(lastSavedAt).toLocaleString("en-GB") : "No copy saved yet"}
            </dd>
          </div>
        </dl>

        <section
          aria-labelledby="offline-what-works-title"
          className="mt-6 border-t border-border pt-5"
        >
          <h3 id="offline-what-works-title" className="text-sm font-semibold text-foreground">
            What works without a connection
          </h3>
          <ul className="mt-2 grid gap-1 text-xs leading-relaxed text-muted-foreground">
            <li>• The knowledge guides, the season calendar and the district climate record.</li>
            <li>• The last copy of the dashboard records saved on this device.</li>
            <li>
              • A change you make is kept locally and retried; the page says clearly when it is
              waiting.
            </li>
            <li>
              • The live forecast and a new database read need a connection. No forecast is invented
              offline.
            </li>
          </ul>
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            <RefreshCw aria-hidden="true" />
            {t.common.refresh}
          </Button>
          <Button type="button" variant="ghost" onClick={clearCache}>
            <Trash2 aria-hidden="true" />
            Clear the saved copy
          </Button>
        </div>

        {cleared && (
          <Callout tone="success" className="mt-4">
            The saved copy has been removed from this browser. The database copy is unchanged.
          </Callout>
        )}
        {storage !== "ready" && (
          <Callout tone="info" className="mt-4">
            {t.storage[storage]} Apply the migration in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              supabase/migrations/20261026000000_agronomist_dashboard.sql
            </code>{" "}
            and set the Supabase server variables to enable stored records.
          </Callout>
        )}
      </PanelBody>
    </Panel>
  );
}
