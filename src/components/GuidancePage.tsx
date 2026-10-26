import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CloudSun,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  Mic,
  Package,
  Sprout,
} from "lucide-react";

import { SiteShell } from "@/components/SiteShell";
import { FieldLink } from "@/components/FieldLink";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { FarmerAssistant } from "@/components/FarmerAssistant";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { SeasonAssistant } from "@/components/SeasonAssistant";
import { guidanceCopy, type GuidanceMode } from "@/lib/guidance";
import { farmerCopy } from "@/lib/farmer-language";
import { useField } from "@/lib/field";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<GuidanceMode, typeof MessageCircleQuestion> = {
  question: MessageCircleQuestion,
  voice: Mic,
  season: CloudSun,
  plan: ListChecks,
};

export function Guidance() {
  // The field and the language come from the app, so this page hosts every
  // assistant once and points back to the Farmer page for the field controls.
  const { field, language } = useField();
  const { district, soil } = field;
  const [mode, setMode] = useState<GuidanceMode>("question");
  const t = guidanceCopy[language];
  const ft = farmerCopy[language];

  return (
    <SiteShell>
      <div lang={language} className="page">
        <header className="page-header">
          <div className="min-w-0">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="page-title mt-2">{t.title}</h1>
            <p className="page-lede">{t.lede}</p>
            <div className="mt-3">
              <FieldLink />
            </div>
          </div>
        </header>

        {/* One place, four plain ways to get help. */}
        <div className="page-section">
          <div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            role="group"
            aria-label={t.eyebrow}
          >
            {(["question", "voice", "season", "plan"] as GuidanceMode[]).map((option) => {
              const Icon = MODE_ICONS[option];
              const selected = mode === option;
              return (
                <button
                  key={option}
                  type="button"
                  data-testid={`guidance-mode-${option}`}
                  aria-pressed={selected}
                  onClick={() => setMode(option)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-accent/50 shadow-card"
                      : "border-border bg-card hover:border-border-strong hover:bg-muted/50",
                  )}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary-text">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {t.modes[option].label}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {t.modes[option].blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="page-section grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            {mode === "question" && (
              <FarmerAssistant district={district} soil={soil} language={language} />
            )}
            {mode === "voice" && (
              <VoiceAssistant district={district} soil={soil} language={language} />
            )}
            {mode === "season" && (
              <SeasonAssistant
                key={`${district}-${language}`}
                district={district}
                language={language}
              />
            )}
            {mode === "plan" && (
              <>
                <Panel aria-labelledby="guidance-plan-title" data-testid="guidance-plan">
                  <PanelHeader
                    icon={<ListChecks className="size-5" aria-hidden="true" />}
                    eyebrow={t.eyebrow}
                    title={t.modes.plan.label}
                    titleId="guidance-plan-title"
                    description={t.planBlurb}
                  />
                  <PanelBody>
                    <ul className="mt-1 grid gap-2 text-sm text-foreground">
                      <li className="flex items-start gap-2">
                        <Sprout
                          className="mt-0.5 size-4 shrink-0 text-primary-text"
                          aria-hidden="true"
                        />
                        {t.planContains.crops}
                      </li>
                      <li className="flex items-start gap-2">
                        <Package
                          className="mt-0.5 size-4 shrink-0 text-primary-text"
                          aria-hidden="true"
                        />
                        {t.planContains.inputs}
                      </li>
                      <li className="flex items-start gap-2">
                        <CloudSun
                          className="mt-0.5 size-4 shrink-0 text-primary-text"
                          aria-hidden="true"
                        />
                        {t.planContains.when}
                      </li>
                    </ul>
                    <Link
                      to="/advice"
                      className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      {t.planLink}
                    </Link>
                  </PanelBody>
                </Panel>
              </>
            )}
          </div>

          <div className="grid gap-6">
            <Panel aria-labelledby="guidance-guide-title" data-testid="guidance-guide">
              <PanelHeader
                icon={<Lightbulb className="size-5" aria-hidden="true" />}
                eyebrow={t.eyebrow}
                title={t.guideTitle}
                titleId="guidance-guide-title"
              />
              <PanelBody>
                <ol className="grid gap-3">
                  {t.guide.map((tip, index) => (
                    <li key={tip} className="flex gap-3 text-sm leading-relaxed">
                      <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary-text">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                  <BookOpen className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {ft.disclosure}: {ft.disclosureText}
                </p>
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
