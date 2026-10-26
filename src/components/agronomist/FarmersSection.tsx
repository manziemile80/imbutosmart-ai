import { useState } from "react";
import { ArrowRight, MapPin, Phone, Sprout, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  DISTRICT_CHOICES,
  RECORD_LABEL,
  SEASON_CHOICES,
  SOIL_CHOICES,
  dashboardCopy,
  filterRecords,
  formatDate,
  formatQuantity,
  recordTitle,
  relatedRecordsForFarmer,
  telLink,
  type AgronomistRecord,
  type DashboardTab,
  type FarmerData,
  type RecordKind,
} from "@/lib/agronomist-dashboard";
import { EditDelete, RecordManager, RecordMeta, type FieldDef } from "./RecordManager";
import type { SectionProps } from "./section-types";

const FARMER_FIELDS: FieldDef[] = [
  { name: "fullName", label: "Farmer's name", required: true },
  { name: "phone", label: "Phone" },
  {
    name: "district",
    label: "District",
    type: "select",
    required: true,
    options: DISTRICT_CHOICES,
  },
  { name: "sector", label: "Sector" },
  { name: "soil", label: "Soil type", type: "select", required: true, options: SOIL_CHOICES },
  { name: "landSizeHa", label: "Land size (ha)", type: "number", step: "0.01", min: "0" },
  { name: "season", label: "Farming season", type: "select", options: SEASON_CHOICES },
  { name: "crops", label: "Crops grown", full: true },
  { name: "challenges", label: "Challenges", type: "textarea", full: true },
  {
    name: "previousRecommendation",
    label: "Previous recommendation",
    type: "textarea",
    full: true,
    help: "Record what was advised and what happened, so the next visit starts from evidence.",
  },
];

export function FarmersSection(props: SectionProps & { onOpenTab?: (tab: DashboardTab) => void }) {
  const t = dashboardCopy[props.language];
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const farmers = props.records.filter(
    (record) => record.kind === "farmer" && (!district || record.data["district"] === district),
  );
  const visible = filterRecords(farmers, query);

  return (
    <Panel aria-labelledby="agronomist-farmers-title">
      <PanelHeader
        icon={<Sprout className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.farmers}
        title="Farmer profiles and history"
        titleId="agronomist-farmers-title"
        description="Only a signed-in agronomist can read these records. Keep the field, the crops, the challenges and the previous advice together so the next recommendation starts from what actually happened."
      />
      <PanelBody>
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            aria-label={t.common.search}
            placeholder={`${t.common.search} farmer, crop or challenge…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter by district"
            className="field h-9"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">{t.common.all} districts</option>
            {DISTRICT_CHOICES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <RecordManager
          kind="farmer"
          fields={FARMER_FIELDS}
          records={visible}
          storage={props.storage}
          canEdit={props.canEdit}
          busy={props.busy}
          save={props.save}
          remove={props.remove}
          formTitle="Add a farmer profile"
          listTitle={`Farmer profiles (${farmers.length})`}
          empty="No farmer profile has been recorded yet."
          language={props.language}
          renderRecord={(record, actions) => {
            const data = record.data as unknown as FarmerData;
            const phone = telLink(data.phone);
            return (
              <article className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-full bg-accent text-foreground">
                      <UserRound className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{data.fullName}</h4>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {[data.district, data.sector].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                  {phone && (
                    <Button asChild variant="outline" size="sm">
                      <a href={phone}>
                        <Phone aria-hidden="true" />
                        Call
                      </a>
                    </Button>
                  )}
                </div>

                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <Detail label="Soil" value={data.soil} />
                  <Detail label="Land size" value={formatQuantity(data.landSizeHa, "ha")} />
                  <Detail label="Season" value={data.season ? `Season ${data.season}` : ""} />
                  <Detail label="Crops" value={data.crops} />
                </dl>
                {data.challenges && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Challenges: </strong>
                    {data.challenges}
                  </p>
                )}
                {data.previousRecommendation && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Previous advice: </strong>
                    {data.previousRecommendation}
                  </p>
                )}
                <FarmerHistory
                  records={relatedRecordsForFarmer(props.records, data.fullName)}
                  farmerName={data.fullName}
                  onOpenTab={props.onOpenTab}
                />
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

const FARMER_HISTORY_TABS: { kind: RecordKind; tab: DashboardTab; label: string }[] = [
  { kind: "recommendation", tab: "recommendations", label: "Open crop advice" },
  { kind: "pest", tab: "pests", label: "Open pest reports" },
  { kind: "message", tab: "communication", label: "Open messages" },
  { kind: "followUp", tab: "reports", label: "Open follow-ups" },
];

function FarmerHistory({
  records,
  farmerName,
  onOpenTab,
}: {
  records: AgronomistRecord[];
  farmerName: string;
  onOpenTab?: ((tab: DashboardTab) => void) | undefined;
}) {
  return (
    <section
      aria-label={`History linked to ${farmerName}`}
      className="mt-3 rounded-lg border border-border bg-muted/30 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-xs font-semibold text-foreground">Linked history ({records.length})</h5>
        <span className="text-[11px] text-muted-foreground">
          Matched by the farmer's name on each record.
        </span>
      </div>
      {records.length === 0 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          No crop advice, pest report, message or follow-up carries this name yet. Add one from its
          tab and type the same name to link it here.
        </p>
      ) : (
        <ul className="mt-2 grid gap-1.5">
          {records.slice(0, 5).map((record) => (
            <li
              key={record.id}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0 text-foreground">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {RECORD_LABEL[record.kind].one}
                </span>
                <span className="block truncate">{recordTitle(record.kind, record.data)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {String(record.data["status"] ?? "")}
                {record.data["status"] ? " · " : ""}
                {formatDate(record.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {onOpenTab && records.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {FARMER_HISTORY_TABS.filter((item) =>
            records.some((record) => record.kind === item.kind),
          ).map((item) => (
            <Button
              key={item.tab}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenTab(item.tab)}
            >
              {item.label}
              <ArrowRight aria-hidden="true" />
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="text-muted-foreground">{value || dashboardCopy.en.common.notRecorded}</dd>
    </div>
  );
}
