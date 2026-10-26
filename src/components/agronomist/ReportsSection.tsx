import { ClipboardList, Download, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout, StatusPill } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  buildActivityCsv,
  dashboardCopy,
  formatDate,
  overviewCounts,
  type FollowUpData,
} from "@/lib/agronomist-dashboard";
import { EditDelete, RecordManager, RecordMeta, type FieldDef } from "./RecordManager";
import type { SectionProps } from "./section-types";

const FOLLOW_UP_FIELDS: FieldDef[] = [
  { name: "farmerName", label: "Farmer", required: true },
  { name: "visitDate", label: "Visit date", type: "date" },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "planned", label: "Planned" },
      { value: "done", label: "Done" },
      { value: "needs-visit", label: "Needs visit" },
    ],
  },
  { name: "cropProgress", label: "Crop progress", type: "textarea", full: true },
  { name: "feedback", label: "Farmer feedback", type: "textarea", full: true },
  { name: "notes", label: "Visit notes", type: "textarea", full: true },
  { name: "nextAction", label: "Next action", type: "textarea", full: true },
];

function downloadCsv(records: SectionProps["records"]) {
  const csv = buildActivityCsv(records);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `imbutosmart-agronomist-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsSection(props: SectionProps) {
  const t = dashboardCopy[props.language];
  const counts = overviewCounts(props.records);
  const followUps = props.records.filter((record) => record.kind === "followUp");
  const approved = props.records.filter(
    (record) =>
      record.kind === "recommendation" &&
      (record.data["status"] === "approved" || record.data["status"] === "modified"),
  ).length;
  const sent = props.records.filter(
    (record) => record.kind === "message" && record.data["status"] === "sent",
  ).length;
  const feedback = followUps.filter((record) =>
    String(record.data["feedback"] ?? "").trim(),
  ).length;

  return (
    <Panel aria-labelledby="agronomist-reports-title">
      <PanelHeader
        icon={<ClipboardList className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.reports}
        title="Reports and follow-up"
        titleId="agronomist-reports-title"
        description="The report is built from the records actually stored for this deployment: no figure is estimated. Download the activity CSV for a report, or use the follow-up list to plan the next visit."
        meta={
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadCsv(props.records)}
            disabled={props.records.length === 0}
          >
            <Download aria-hidden="true" />
            {t.common.download} CSV
          </Button>
        }
      />
      <PanelBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Count label="Farmers" value={counts.farmers} />
          <Count label="Agronomists" value={counts.agronomists} />
          <Count label="Recommendations" value={counts.recommendations} />
          <Count label="Pending review" value={counts.pendingRecommendations} />
          <Count label="Advice delivered" value={approved} />
          <Count label="Messages sent" value={sent} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          “Advice delivered” counts recommendations an agronomist approved or modified. “Messages
          sent” counts messages an agronomist marked sent; the app does not confirm delivery.
          Feedback notes recorded on visits: {feedback}.
        </p>

        <div className="mt-6">
          <RecordManager
            kind="followUp"
            fields={FOLLOW_UP_FIELDS}
            records={followUps}
            storage={props.storage}
            canEdit={props.canEdit}
            busy={props.busy}
            save={props.save}
            remove={props.remove}
            formTitle="Record a follow-up"
            listTitle={`Follow-ups (${followUps.length})`}
            empty="No follow-up has been recorded yet."
            language={props.language}
            renderRecord={(record, actions) => {
              const data = record.data as unknown as FollowUpData;
              return (
                <article className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <UserCheck className="size-4 text-primary-text" aria-hidden="true" />
                      {data.farmerName}
                    </h4>
                    <span className="flex flex-wrap gap-2">
                      <StatusPill tone={data.status === "done" ? "success" : "warning"}>
                        {data.status}
                      </StatusPill>
                      <StatusPill tone="neutral">{formatDate(data.visitDate)}</StatusPill>
                    </span>
                  </div>
                  {data.cropProgress && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Crop progress: </strong>
                      {data.cropProgress}
                    </p>
                  )}
                  {data.feedback && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Farmer feedback: </strong>
                      {data.feedback}
                    </p>
                  )}
                  {data.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Notes: </strong>
                      {data.notes}
                    </p>
                  )}
                  {data.nextAction && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Next action: </strong>
                      {data.nextAction}
                    </p>
                  )}
                  <RecordMeta record={record} language={props.language} />
                  <EditDelete actions={actions} language={props.language} />
                </article>
              );
            }}
          />
        </div>

        {props.records.length === 0 && (
          <Callout tone="info" className="mt-5">
            The report is empty because no record has been stored yet. Add a farmer, a product or a
            follow-up and the CSV will carry it.
          </Callout>
        )}
      </PanelBody>
    </Panel>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular text-foreground">{value}</p>
    </div>
  );
}
