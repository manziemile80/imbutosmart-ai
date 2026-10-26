import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, WifiOff } from "lucide-react";

import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { dashboardCopy } from "@/lib/agronomist-dashboard";
import {
  KNOWLEDGE_GUIDES,
  type GuideCategory,
  type KnowledgeGuide,
} from "@/lib/agronomist-reference";
import type { SectionProps } from "./section-types";

const CATEGORY_LABELS: Record<GuideCategory, string> = {
  soil: "Soil",
  calendar: "Season calendar",
  water: "Water and erosion",
  crop: "Crop management",
  harvest: "Harvest and storage",
  pest: "Pests and disease",
};

function matches(guide: KnowledgeGuide, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [guide.title, guide.summary, ...guide.steps].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function KnowledgeSection({ language }: SectionProps) {
  const t = dashboardCopy[language];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const guides = useMemo(
    () =>
      KNOWLEDGE_GUIDES.filter(
        (guide) => (!category || guide.category === category) && matches(guide, query),
      ),
    [category, query],
  );

  return (
    <Panel aria-labelledby="agronomist-knowledge-title">
      <PanelHeader
        icon={<BookOpen className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.knowledge}
        title="Training and knowledge centre"
        titleId="agronomist-knowledge-title"
        description="Short, practical guides for extension work. They are bundled with the page, so they stay available when the connection drops. They give no invented application rate, price or diagnosis."
      />
      <PanelBody>
        <Callout tone="info" className="mb-4">
          <WifiOff className="size-4" aria-hidden="true" />
          These guides are part of the app bundle and can be read offline after the page has loaded
          once. A saved copy of the dashboard records is kept on the device for an offline visit.
        </Callout>
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            aria-label={t.common.search}
            placeholder={`${t.common.search} guides…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter by category"
            className="field h-9"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">{t.common.all} categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {guides.length === 0 ? (
          <p className="text-sm text-muted-foreground">No guide matches that search.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {guides.map((guide) => (
              <li key={guide.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-text">
                  {CATEGORY_LABELS[guide.category]}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{guide.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {guide.summary}
                </p>
                <ol className="mt-2 grid gap-1 text-xs leading-relaxed text-muted-foreground">
                  {guide.steps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ol>
                <p className="mt-2 text-[11px] text-muted-foreground">{guide.source}</p>
                <a
                  className="link-quiet mt-2 inline-flex items-center gap-1 text-xs"
                  href={guide.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Open the source
                </a>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
