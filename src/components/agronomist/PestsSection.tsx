import { useState } from "react";
import { Bug, ExternalLink } from "lucide-react";

import { Callout, StatusPill } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  DISTRICT_CHOICES,
  SOURCE_LINKS,
  dashboardCopy,
  filterRecords,
  formatDate,
  type PestReportData,
} from "@/lib/agronomist-dashboard";
import { EditDelete, RecordManager, RecordMeta, type FieldDef } from "./RecordManager";
import type { SectionProps } from "./section-types";

const PEST_FIELDS: FieldDef[] = [
  { name: "crop", label: "Crop", required: true },
  { name: "farmerName", label: "Farmer" },
  {
    name: "district",
    label: "District",
    type: "select",
    required: true,
    options: DISTRICT_CHOICES,
  },
  { name: "reportedAt", label: "Reported on", type: "date" },
  {
    name: "severity",
    label: "Severity",
    type: "select",
    required: true,
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "open", label: "Open" },
      { value: "treated", label: "Treated" },
      { value: "referred", label: "Referred" },
      { value: "closed", label: "Closed" },
    ],
  },
  { name: "symptoms", label: "What was seen", type: "textarea", full: true, required: true },
  {
    name: "possibleCause",
    label: "Possible cause",
    type: "textarea",
    full: true,
    help: "Record what the agronomist observed. Do not present a guess as a laboratory diagnosis.",
  },
  {
    name: "prevention",
    label: "Prevention advice",
    type: "textarea",
    full: true,
    help: "What should the farmer change to stop this spreading or returning? Cultural measures come first.",
  },
  {
    name: "recommendation",
    label: "Treatment advice",
    type: "textarea",
    full: true,
    help: "General integrated pest management first. Any chemical product follows its label and local extension advice.",
  },
  {
    name: "referredTo",
    label: "Referred to",
    placeholder: "RAB, district agronomist, laboratory…",
  },
];

function severityTone(value: unknown): "neutral" | "success" | "warning" {
  if (value === "high") return "warning";
  if (value === "low") return "success";
  return "neutral";
}

export function PestsSection(props: SectionProps) {
  const t = dashboardCopy[props.language];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const pests = props.records.filter(
    (record) => record.kind === "pest" && (!status || record.data["status"] === status),
  );
  const visible = filterRecords(pests, query);

  return (
    <Panel aria-labelledby="agronomist-pests-title">
      <PanelHeader
        icon={<Bug className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.pests}
        title="Pests and disease reports"
        titleId="agronomist-pests-title"
        description="Record what was reported, what the agronomist observed, the advice given and whether the case was referred. A field observation is not a laboratory diagnosis: say what is known and refer serious cases."
      />
      <PanelBody>
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            aria-label={t.common.search}
            placeholder={`${t.common.search} crop, symptom or farmer…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter by status"
            className="field h-9"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">{t.common.all} statuses</option>
            <option value="open">Open</option>
            <option value="treated">Treated</option>
            <option value="referred">Referred</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <Callout tone="info" className="mb-5">
          For a serious or spreading outbreak, refer the case to RAB or the district agronomist. The
          app does not identify a pest from a photograph and does not prescribe a pesticide rate.{" "}
          <a
            className="link-quiet inline-flex items-center gap-1"
            href={SOURCE_LINKS.rab.url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            RAB
          </a>
        </Callout>

        <RecordManager
          kind="pest"
          fields={PEST_FIELDS}
          records={visible}
          storage={props.storage}
          canEdit={props.canEdit}
          busy={props.busy}
          save={props.save}
          remove={props.remove}
          formTitle="Record a pest or disease report"
          listTitle={`Reports (${pests.length})`}
          empty="No pest or disease report has been recorded yet."
          language={props.language}
          renderRecord={(record, actions) => {
            const data = record.data as unknown as PestReportData;
            return (
              <article className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {data.crop}
                    {data.farmerName ? ` · ${data.farmerName}` : ""}
                  </h4>
                  <span className="flex flex-wrap gap-2">
                    <StatusPill tone={severityTone(data.severity)}>{data.severity}</StatusPill>
                    <StatusPill tone={data.status === "open" ? "warning" : "neutral"}>
                      {data.status}
                    </StatusPill>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.district} · reported {formatDate(data.reportedAt)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Observed: </strong>
                  {data.symptoms}
                </p>
                {data.possibleCause && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Possible cause: </strong>
                    {data.possibleCause}
                  </p>
                )}
                {data.prevention && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Prevention: </strong>
                    {data.prevention}
                  </p>
                )}
                {data.recommendation && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Treatment: </strong>
                    {data.recommendation}
                  </p>
                )}
                {data.referredTo && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Referred to: </strong>
                    {data.referredTo}
                  </p>
                )}
                <RecordMeta record={record} language={props.language} />
                <EditDelete actions={actions} language={props.language} />
              </article>
            );
          }}
        />
      </PanelBody>
    </Panel>
  );
}
