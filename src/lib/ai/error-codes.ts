// Stable contract shared across the server/client boundary for AI requests.
// The browser maps error codes to farmer-facing copy; the server never sends raw
// provider errors to the UI.
export type AiErrorCode = "unconfigured" | "failed" | "empty";

export type AiAnswer = { answer: string; error: AiErrorCode | null };
