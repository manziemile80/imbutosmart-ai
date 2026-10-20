// End-to-end check of the app's own server functions against whichever AI
// backend is configured (local models or a hosted provider). Unlike
// scripts/test-voice-e2e.ps1, which calls the raw OpenAI-compatible endpoints,
// this drives the same server functions the browser calls, so it covers the
// app's validation, prompting and error handling too.
//
// Usage:
//   1. Start the speech backend (local speech server, or configure a provider)
//   2. Start the dev server:            npm run dev
//   3. Run this check:                  node scripts\test-app-ai-e2e.mjs
//
// Set APP_URL to point at a different dev server (default http://localhost:5173).

import { toJSONAsync, fromCrossJSON } from "seroval";
import { createDefaultSerovalPlugins } from "@tanstack/router-core/ssr/client";

const APP_URL = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
const plugins = createDefaultSerovalPlugins();

function fnId(file, exportName) {
  const spec = {
    file: `/src/lib/${file}?tss-serverfn-split`,
    export: `${exportName}_createServerFn_handler`,
  };
  return Buffer.from(JSON.stringify(spec), "utf8").toString("base64url");
}

// Mirrors the browser's client-RPC transport: a seroval cross-JSON body, the
// server-function marker header, and a same-origin Origin so the app's CSRF
// middleware accepts the request.
async function call(file, exportName, data, method = "POST") {
  const url = `${APP_URL}/_serverFn/${fnId(file, exportName)}`;
  const headers = {
    "x-tsr-serverFn": "true",
    accept: "application/x-ndjson, application/json",
    origin: APP_URL,
  };
  let body;
  if (method === "POST") {
    headers["content-type"] = "application/json";
    body = JSON.stringify(await toJSONAsync(data === undefined ? {} : { data }, { plugins }));
  }
  const response = await fetch(url, { method, headers, body });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 400)}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Unexpected content-type: ${contentType}`);
  }
  const parsed = fromCrossJSON(JSON.parse(text), { plugins });
  return parsed?.result ?? parsed;
}

let failures = 0;

function check(label, condition, detail) {
  const status = condition ? "OK  " : "FAIL";
  if (!condition) failures += 1;
  console.log(`  [${status}] ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log(`Checking the ImbutoSmart AI app at ${APP_URL}\n`);

try {
  // Warm the dev server so every server-function module is compiled before the
  // first call resolves it by id.
  const page = await fetch(`${APP_URL}/`);
  if (!page.ok) throw new Error(`App returned ${page.status}`);
  await page.text();
} catch (error) {
  console.error(`Cannot reach the app at ${APP_URL}: ${error.message}`);
  console.error("Start the dev server with: npm run dev");
  process.exit(1);
}

console.log("1/5 Voice configuration");
const voiceStatus = await call(
  "voice-assistant.functions.ts",
  "getVoiceConfigStatus",
  undefined,
  "GET",
);
check("server reports voice as configured", voiceStatus?.configured === true);
check(
  "no credential reaches the browser",
  !JSON.stringify(voiceStatus).toLowerCase().includes("key"),
);
check(
  "server reports which languages it can speak aloud",
  Array.isArray(voiceStatus?.spokenLanguages) && voiceStatus.spokenLanguages.length > 0,
  (voiceStatus?.spokenLanguages ?? []).join(", "),
);

console.log("2/5 Farmer Q&A (English)");
const english = await call("farmer-chat.functions.ts", "askFarmerAssistant", {
  district: "Musanze",
  soil: "Volcanic",
  language: "en",
  messages: [{ role: "user", content: "How do I improve maize yields after heavy rain?" }],
});
check("answer returned", Boolean(english?.answer), english?.answer?.slice(0, 80));
check("no error reported", english?.error === null, english?.error ?? "");

console.log("3/5 Farmer Q&A (Kinyarwanda)");
const kinyarwanda = await call("farmer-chat.functions.ts", "askFarmerAssistant", {
  district: "Musanze",
  soil: "Volcanic",
  language: "rw",
  messages: [{ role: "user", content: "Esekeza umugunda w'ibigega?" }],
});
check("answer returned", Boolean(kinyarwanda?.answer), kinyarwanda?.answer?.slice(0, 80));
check("no error reported", kinyarwanda?.error === null, kinyarwanda?.error ?? "");

console.log("4/5 Season explanation");
const season = await call("season-assistant.functions.ts", "explainSeason", {
  district: "Musanze",
  month: 3,
  rainfall_mm: 120,
  days_since_rain: 6,
  language: "en",
});
check("explanation returned", Boolean(season?.answer), season?.answer?.slice(0, 80));
check("no error reported", season?.error === null, season?.error ?? "");
// The season guide holds no measurements, so the app replaces an explanation
// that states one. A digit means an invented figure reached the farmer.
check(
  "no invented measurement",
  !/\d/.test(season?.answer ?? ""),
  season?.answer?.match(/\d[^ ]*/g)?.join(" "),
);

console.log("5/5 Speech round trip");
const spoken = await call("voice-assistant.functions.ts", "speakFarmerText", {
  text: "Maize needs good drainage after heavy rain.",
  language: "en",
});
if (spoken?.error === "unavailable") {
  // The backend is reachable but the configured plan does not include reading
  // answers aloud. The app reports that calmly instead of failing.
  check("app reports spoken output as unavailable instead of failing", true);
  console.log("      the configured speech plan does not include reading answers aloud");
  console.log("      transcription could not be checked without a spoken clip");
} else {
  const audioBytes = spoken?.audio ? Buffer.from(spoken.audio, "base64").length : 0;
  check("speech synthesised", audioBytes > 0, `${audioBytes} bytes, ${spoken?.mimeType}`);
  const transcript = await call("voice-assistant.functions.ts", "transcribeFarmerSpeech", {
    audioBase64: spoken?.audio,
    mimeType: spoken?.mimeType,
    language: "en",
  });
  check("speech transcribed", Boolean(transcript?.text), transcript?.text);
  // The tiny local ASR model can mishear a word, so match on a word it rarely
  // gets wrong rather than on the crop name.
  check("transcript mentions drainage", /drain/i.test(transcript?.text ?? ""));
}

console.log("");
if (failures > 0) {
  console.error(`FAILED: ${failures} check(s) did not pass.`);
  process.exit(1);
}
console.log("END-TO-END OK: the app's server functions answered on the configured backends");
