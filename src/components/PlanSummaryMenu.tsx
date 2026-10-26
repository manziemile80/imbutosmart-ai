import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useField } from "@/lib/field";
import { announcementCopy, buildAnnouncements } from "@/lib/announcements";

// The bell is the app's announcement feed, not the summary itself: each notice
// says what changed or what to check, and links to the one page that holds the
// detail. The figures stay on Summary get, Advice and the Farmer page.
export function PlanSummaryMenu() {
  const { field, language } = useField();
  const { district } = field;
  const t = announcementCopy[language];
  const items = buildAnnouncements({ district, language });
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

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

  // The first notice is focused when the feed opens, so the keyboard is ready.
  useEffect(() => {
    if (open) firstLink.current?.focus();
  }, [open]);

  return (
    <div className="relative" ref={wrapper}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={t.label}
        aria-expanded={open}
        title={t.label}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <BellRing aria-hidden="true" /> : <Bell aria-hidden="true" />}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={t.label}
          className="absolute right-0 top-full z-30 mt-2 flex max-h-[min(80vh,34rem)] w-[min(92vw,26rem)] flex-col rounded-2xl border border-border bg-card text-left shadow-pop"
        >
          <div className="flex items-start justify-between gap-3 p-5 pb-3">
            <div>
              <p className="eyebrow">{district}</p>
              <p className="mt-1 font-display text-lg text-foreground">{t.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.intro}</p>
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

          <ul className="overflow-y-auto px-5 pb-5">
            {items.map((item, index) => (
              <li key={item.id} className="border-t border-border py-3 first:border-t-0 first:pt-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                <Link
                  ref={index === 0 ? firstLink : undefined}
                  to={item.link.to}
                  className="mt-2 inline-flex text-xs font-medium text-primary-text underline-offset-4 hover:underline"
                  onClick={() => setOpen(false)}
                >
                  {item.link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
