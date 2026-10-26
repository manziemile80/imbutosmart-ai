import { useState } from "react";
import { ExternalLink, Leaf, Package, ShieldAlert } from "lucide-react";

import { Callout, StatusPill } from "@/components/ui/callout";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INPUT_CATEGORY_LABELS,
  dashboardCopy,
  filterRecords,
  formatDate,
  formatQuantity,
  formatRwf,
  type AgronomistRecord,
  type ProductData,
} from "@/lib/agronomist-dashboard";
import { REFERENCE_INPUTS } from "@/lib/agronomist-reference";
import { EditDelete, RecordManager, RecordMeta, type FieldDef } from "./RecordManager";
import type { SectionProps } from "./section-types";

const PRODUCT_FIELDS: FieldDef[] = [
  {
    name: "category",
    label: "Category",
    type: "select",
    required: true,
    options: [
      { value: "manure", label: "Manure" },
      { value: "fertilizer", label: "Fertiliser" },
    ],
  },
  { name: "name", label: "Product name", required: true, placeholder: "e.g. Cow dung" },
  { name: "uses", label: "Uses", type: "textarea", full: true },
  { name: "benefits", label: "Benefits", type: "textarea", full: true },
  { name: "suitableCrops", label: "Suitable crops", full: true },
  {
    name: "applicationGuidance",
    label: "Application guidance",
    type: "textarea",
    full: true,
    help: "General guidance only. Do not enter an application rate unless it comes from a soil test, the product label or local extension advice.",
  },
  {
    name: "availableQuantity",
    label: "Available quantity",
    type: "number",
    step: "0.01",
    min: "0",
  },
  {
    name: "quantityUnit",
    label: "Quantity unit",
    type: "select",
    options: [
      { value: "kg", label: "kg" },
      { value: "bag", label: "bag" },
      { value: "tonne", label: "tonne" },
    ],
  },
  { name: "supplier", label: "Supplier", placeholder: "Verified supplier or cooperative" },
  {
    name: "priceRwf",
    label: "Price (RWF)",
    type: "number",
    step: "1",
    min: "0",
    help: "Leave blank until a verified local price is available. A price needs a supplier, a source and the date checked.",
  },
  {
    name: "priceUnit",
    label: "Price unit",
    type: "select",
    options: [
      { value: "kg", label: "per kg" },
      { value: "bag", label: "per bag" },
    ],
  },
  { name: "bagSizeKg", label: "Bag size (kg)", type: "number", step: "0.1", min: "0" },
  { name: "location", label: "Location" },
  { name: "source", label: "Price / supplier source", full: true },
  { name: "sourceUrl", label: "Source link", placeholder: "https://…" },
  { name: "priceUpdatedAt", label: "Date price checked", type: "date" },
  {
    name: "verified",
    label: "Verified locally",
    type: "checkbox",
    help: "I checked this with the supplier.",
  },
];

function priceAge(data: ProductData): string | null {
  if (!data.priceUpdatedAt) return null;
  const checked = new Date(`${data.priceUpdatedAt}T00:00:00Z`);
  if (Number.isNaN(checked.getTime())) return null;
  const days = Math.floor((Date.now() - checked.getTime()) / 86_400_000);
  if (days > 90)
    return `The price was last checked ${days} days ago. Confirm it before quoting it.`;
  return null;
}

export function InputsSection(props: SectionProps) {
  const t = dashboardCopy[props.language];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const products = props.records.filter(
    (record) => record.kind === "product" && (!category || record.data["category"] === category),
  );
  const visible = filterRecords(products, query);
  const recordedNames = new Set(
    products.map((record) =>
      String(record.data["name"] ?? "")
        .trim()
        .toLowerCase(),
    ),
  );
  const reference = REFERENCE_INPUTS.filter((item) => !recordedNames.has(item.name.toLowerCase()));

  async function addReference(item: (typeof REFERENCE_INPUTS)[number]) {
    const { referenceId: _referenceId, ...data } = item;
    await props.save("product", data, null);
  }

  return (
    <Panel aria-labelledby="agronomist-inputs-title">
      <PanelHeader
        icon={<Package className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.inputs}
        title="Manure and fertiliser, with verified local prices"
        titleId="agronomist-inputs-title"
        description="The reference catalogue explains what each product is for. A price is shown only when an agronomist records the supplier, the source and the date it was checked. No price or application rate is invented by the app."
      />
      <PanelBody>
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            aria-label={t.common.search}
            placeholder={`${t.common.search} products…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter by category"
            className="field h-9"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">{t.common.all}</option>
            <option value="manure">Manure</option>
            <option value="fertilizer">Fertiliser</option>
          </select>
        </div>

        <RecordManager
          kind="product"
          fields={PRODUCT_FIELDS}
          records={visible}
          storage={props.storage}
          canEdit={props.canEdit}
          busy={props.busy}
          save={props.save}
          remove={props.remove}
          formTitle="Add or update a product"
          listTitle={`Recorded products (${products.length})`}
          empty="No local product or price has been recorded yet. The reference catalogue below still explains each product type."
          language={props.language}
          renderRecord={(record, actions) => {
            const data = record.data as unknown as ProductData;
            const warning = priceAge(data);
            return (
              <article className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{data.name}</h4>
                      <StatusPill tone="neutral">
                        {INPUT_CATEGORY_LABELS[data.category] ?? data.category}
                      </StatusPill>
                      <StatusPill tone={data.verified ? "success" : "warning"}>
                        {data.verified ? t.common.verified : t.common.unverified}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {data.uses || "Uses not recorded."}
                    </p>
                  </div>
                  <p className="text-right text-sm font-semibold text-foreground">
                    {formatRwf(data.priceRwf)}
                    {data.priceRwf != null && data.priceUnit ? (
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        per {data.priceUnit}
                      </span>
                    ) : null}
                  </p>
                </div>

                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <Detail label="Supplier" value={data.supplier} />
                  <Detail label="Location" value={data.location} />
                  <Detail
                    label="Available quantity"
                    value={formatQuantity(data.availableQuantity, data.quantityUnit)}
                  />
                  <Detail
                    label="Bag size"
                    value={data.bagSizeKg == null ? "" : `${data.bagSizeKg} kg`}
                  />
                  <Detail label="Suitable crops" value={data.suitableCrops} />
                  <Detail label="Last price update" value={formatDate(data.priceUpdatedAt)} />
                  <Detail label="Source" value={data.source} />
                </dl>

                {data.applicationGuidance && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Guidance: </strong>
                    {data.applicationGuidance}
                  </p>
                )}
                {warning && (
                  <Callout tone="warning" className="mt-3 text-xs">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                    {warning}
                  </Callout>
                )}
                {data.sourceUrl && (
                  <a
                    className="link-quiet mt-2 inline-flex items-center gap-1 text-xs"
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    Open the source
                  </a>
                )}
                <RecordMeta record={record} language={props.language} />
                <EditDelete actions={actions} language={props.language} />
              </article>
            );
          }}
        />

        <section
          aria-labelledby="reference-inputs-title"
          className="mt-8 border-t border-border pt-5"
        >
          <div className="flex items-center gap-2">
            <Leaf className="size-4 text-primary-text" aria-hidden="true" />
            <h3 id="reference-inputs-title" className="text-sm font-semibold text-foreground">
              Reference catalogue — no price recorded
            </h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            General agronomic reference, not a local offer. Add a local record to enter a supplier,
            a verified price and the date it was checked.
          </p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {reference.map((item) => (
              <li
                key={item.referenceId}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                  <StatusPill tone="neutral">{INPUT_CATEGORY_LABELS[item.category]}</StatusPill>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.uses}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Suitable crops: </strong>
                  {item.suitableCrops}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {item.applicationGuidance}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t.common.source}: {item.source}
                </p>
                {props.canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void addReference(item)}
                  >
                    Use as a local record
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </PanelBody>
    </Panel>
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
