import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { Check, ChevronDown } from "lucide-react";

import { FlagFR, FlagGB, FlagRW } from "@/components/Flags";
import type { FarmerLanguage } from "@/lib/farmer-language";

// The language belongs to the app, so it is chosen once in the header. Each
// language is offered with its own flag and its own name, and the current
// choice stays visible as a flag and a short code.

const LANGUAGE_OPTIONS = [
  { value: "en", code: "EN", name: "English", Flag: FlagGB },
  { value: "rw", code: "RW", name: "Kinyarwanda", Flag: FlagRW },
  { value: "fr", code: "FR", name: "Français", Flag: FlagFR },
] as const satisfies ReadonlyArray<{
  value: FarmerLanguage;
  code: string;
  name: string;
  Flag: (props: { className?: string }) => ReactElement;
}>;

type LanguagePickerProps = {
  language: FarmerLanguage;
  onChange: (language: FarmerLanguage) => void;
  label: string;
};

export function LanguagePicker({ language, onChange, label }: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<Array<HTMLLIElement | null>>([]);

  const current =
    LANGUAGE_OPTIONS.find((option) => option.value === language) ?? LANGUAGE_OPTIONS[0];
  const CurrentFlag = current.Flag;

  const openPanel = () => {
    const index = LANGUAGE_OPTIONS.findIndex((option) => option.value === language);
    setActiveIndex(index < 0 ? 0 : index);
    setOpen(true);
  };

  const close = (focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  };

  const choose = (value: FarmerLanguage) => {
    onChange(value);
    close(true);
  };

  // A click away closes the panel, so it never covers the page behind it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Opening the panel puts the keyboard on the language already chosen.
  useEffect(() => {
    if (!open) return;
    items.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + LANGUAGE_OPTIONS.length) % LANGUAGE_OPTIONS.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(LANGUAGE_OPTIONS.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = LANGUAGE_OPTIONS[activeIndex];
      if (option) choose(option.value);
    }
  };

  return (
    <div className="language-picker" ref={wrapper}>
      <button
        ref={trigger}
        id="app-language"
        type="button"
        className="language-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="app-language-panel"
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (open) return;
            openPanel();
          }
        }}
      >
        <CurrentFlag />
        <span className="language-code">{current.code}</span>
        <ChevronDown className="language-chevron" data-open={open} aria-hidden="true" />
      </button>

      {open && (
        <ul
          id="app-language-panel"
          role="listbox"
          aria-label={`${label}: ${current.name}`}
          className="language-panel"
          onKeyDown={onListKeyDown}
        >
          {LANGUAGE_OPTIONS.map((option, index) => {
            const Flag = option.Flag;
            return (
              <li
                key={option.value}
                ref={(element) => {
                  items.current[index] = element;
                }}
                role="option"
                aria-selected={option.value === language}
                tabIndex={index === activeIndex ? 0 : -1}
                className="language-option"
                onClick={() => choose(option.value)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <Flag />
                <span className="language-name">{option.name}</span>
                {option.value === language && (
                  <Check className="language-check" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
