import { ExternalLink, ShieldCheck } from "lucide-react";

import { Callout, StatusPill } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  INSURANCE_OFFICIAL_URL,
  dashboardCopy,
  type InsuranceData,
} from "@/lib/agronomist-dashboard";
import { insuranceCopy } from "@/lib/insurance-language";
import { EditDelete, RecordManager, RecordMeta, type FieldDef } from "./RecordManager";
import type { SectionProps } from "./section-types";

const INSURANCE_FIELDS: FieldDef[] = [
  { name: "provider", label: "Insurer or programme", required: true },
  { name: "productName", label: "Product name", required: true },
  { name: "coverage", label: "Coverage", type: "textarea", full: true },
  { name: "eligibility", label: "Eligibility", type: "textarea", full: true },
  {
    name: "premiumNote",
    label: "Premium note",
    type: "textarea",
    full: true,
    help: "Do not invent a premium. Record only a written quote or say that a quote is required.",
  },
  { name: "exclusions", label: "Exclusions", type: "textarea", full: true },
  { name: "claimProcedure", label: "Claim procedure", type: "textarea", full: true },
  { name: "providerContact", label: "Verified provider contact" },
  { name: "sourceUrl", label: "Source link", placeholder: "https://…" },
  {
    name: "verified",
    label: "Policy information verified",
    type: "checkbox",
    help: "I checked this against a written policy or the provider.",
  },
];

export function InsuranceSection(props: SectionProps) {
  const t = dashboardCopy[props.language];
  const copy = insuranceCopy[props.language];
  const products = props.records.filter((record) => record.kind === "insurance");

  return (
    <Panel aria-labelledby="agronomist-insurance-title">
      <PanelHeader
        icon={<ShieldCheck className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.insurance}
        title="Crop insurance advisory"
        titleId="agronomist-insurance-title"
        description="Explain what a farmer can ask an insurer, not what the app promises. Coverage, eligibility and premiums come from the policy document; the app records a verified product only with its source."
      />
      <PanelBody>
        <Callout tone="info" className="mb-5">
          {copy.disclaimer}{" "}
          <a
            className="link-quiet inline-flex items-center gap-1"
            href={INSURANCE_OFFICIAL_URL}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            {copy.source}
          </a>
        </Callout>

        <section
          aria-labelledby="insurance-checklist-title"
          className="rounded-xl border border-border bg-muted/30 p-4"
        >
          <h3 id="insurance-checklist-title" className="text-sm font-semibold text-foreground">
            {copy.compare}
          </h3>
          <ul className="mt-2 grid gap-1 text-xs leading-relaxed text-muted-foreground">
            {copy.checklist.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.damage}</p>
        </section>

        <div className="mt-6">
          <RecordManager
            kind="insurance"
            fields={INSURANCE_FIELDS}
            records={products}
            storage={props.storage}
            canEdit={props.canEdit}
            busy={props.busy}
            save={props.save}
            remove={props.remove}
            formTitle="Record a verified insurance product"
            listTitle={`Recorded insurance products (${products.length})`}
            empty="No insurance product has been recorded. Use the official programme link and a written policy; do not invent cover or a premium."
            language={props.language}
            renderRecord={(record, actions) => {
              const data = record.data as unknown as InsuranceData;
              return (
                <article className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {data.productName}
                      <span className="font-normal text-muted-foreground"> · {data.provider}</span>
                    </h4>
                    <StatusPill tone={data.verified ? "success" : "warning"}>
                      {data.verified ? t.common.verified : t.common.unverified}
                    </StatusPill>
                  </div>
                  <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                    <Detail label="Coverage" value={data.coverage} />
                    <Detail label="Eligibility" value={data.eligibility} />
                    <Detail label="Premium" value={data.premiumNote} />
                    <Detail label="Exclusions" value={data.exclusions} />
                    <Detail label="Claim procedure" value={data.claimProcedure} />
                    <Detail label="Provider contact" value={data.providerContact} />
                  </dl>
                  {data.sourceUrl && (
                    <a
                      className="link-quiet mt-2 inline-flex items-center gap-1 text-xs"
                      href={data.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      Open the policy source
                    </a>
                  )}
                  <RecordMeta record={record} language={props.language} />
                  <EditDelete actions={actions} language={props.language} />
                </article>
              );
            }}
          />
        </div>
      </PanelBody>
    </Panel>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="text-muted-foreground">{value || "Not recorded"}</dd>
    </div>
  );
}
