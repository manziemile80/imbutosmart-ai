import { cn } from "@/lib/utils";

// The flags of the languages the app speaks, drawn inline as SVG. Windows does
// not render regional-indicator flag emoji, so the selector carries a real
// drawing instead of a pair of letters in a box.

type FlagProps = { className?: string };

export function FlagGB({ className }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={cn("language-flag", className)}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0 60 30M60 0 0 30" fill="none" stroke="#ffffff" strokeWidth="6" />
      <path d="M0 0 60 30M60 0 0 30" fill="none" stroke="#C8102E" strokeWidth="2.5" />
      <path d="M30 0v30M0 15h60" fill="none" stroke="#ffffff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" fill="none" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function FlagRW({ className }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={cn("language-flag", className)}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="60" height="15" fill="#00A1DE" />
      <rect y="15" width="60" height="7.5" fill="#FAD201" />
      <rect y="22.5" width="60" height="7.5" fill="#20603D" />
      <circle cx="45" cy="8" r="3.2" fill="#E5BE01" />
      <g fill="none" stroke="#E5BE01" strokeWidth="1" strokeLinecap="round">
        <path d="M49.4 8h2.2" />
        <path d="M48.11 11.11l1.56 1.56" />
        <path d="M45 12.4v2.2" />
        <path d="M41.89 11.11l-1.56 1.56" />
        <path d="M40.6 8h-2.2" />
        <path d="M41.89 4.89l-1.56-1.56" />
        <path d="M45 3.6V1.4" />
        <path d="M48.11 4.89l1.56-1.56" />
      </g>
    </svg>
  );
}

export function FlagFR({ className }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={cn("language-flag", className)}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="30" fill="#002395" />
      <rect x="20" width="20" height="30" fill="#ffffff" />
      <rect x="40" width="20" height="30" fill="#ED2939" />
    </svg>
  );
}
