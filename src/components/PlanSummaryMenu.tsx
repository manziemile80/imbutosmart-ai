import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useField } from "@/lib/field";
import { summaryCopy } from "@/lib/plan-summary";
import type { FarmerLanguage } from "@/lib/farmer-language";

// The bell is the announcement, not the summary itself: it says the summary
// for the farmer's field is ready and takes them to Summary get, where the
// whole plan can be read, downloaded, shared or emailed. Keeping the figures
// on their own page means the header never carries a wall of numbers.
export function PlanSummaryMenu({ language = "en" }: { language?: FarmerLanguage }) {
  const { field } = useField();
  const { district } = field;
  const t = summaryCopy[language];
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const openLink = useRef<HTMLAnchorElement>(null);

  // The panel closes when the farmer clicks away from it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The announcement has one action, so it is focused when the panel opens.
  useEffect(() => {
    if (open) openLink.current?.focus();
  }, [open]);

  return (
    <div className="relative" ref={wrapper}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={t.title}
        aria-expanded={open}
        title={t.title}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <BellRing aria-hidden="true" /> : <Bell aria-hidden="true" />}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          className="absolute right-0 top-full z-30 mt-2 flex w-[min(92vw,24rem)] flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-pop"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{district}</p>
              <p className="mt-1 font-display text-lg text-foreground">{t.announceTitle}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t.announceBody.replace("{district}", district)}
          </p>

          <Button asChild className="mt-4 h-10 w-full">
            <Link ref={openLink} to="/summary" onClick={() => setOpen(false)}>
              <FileText aria-hidden="true" />
              {t.openSummary}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
