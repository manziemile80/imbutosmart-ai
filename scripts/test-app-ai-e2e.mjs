// End-to-end check of the app's own server functions against whichever AI
// backend is configured (local models or a hosted provider). Unlike
// scripts/test-voice-e2e.ps1, which calls the raw OpenAI-compatible endpoints,
// this drives the same server functions the browser calls, so it covers the
// app's validation, prompting and error handling too.
//
// The spoken path is checked in both directions: the backend reads an answer
// aloud when it can, and a recorded question is transcribed either way, so a
// deployment that cannot speak still proves the farmer's recording works.
//
// Usage:
//   1. Start the speech backend (local speech server, or configure a provider)
//   2. Start the app:                    npm run dev   (or a deployed URL)
//   3. Run this check:                  node scripts\test-app-ai-e2e.mjs
//
// Set APP_URL to point at a different server (default http://localhost:5173).
// A deployed build and a dev server address the server functions differently,
// so the check works out which one it is talking to.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { toJSONAsync, fromCrossJSON } from "seroval";
import { createDefaultSerovalPlugins } from "@tanstack/router-core/ssr/client";

const APP_URL = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
const plugins = createDefaultSerovalPlugins();

// A spoken sample of the same question, used to check the recording path on a
// deployment whose speech backend cannot read answers aloud.
const SAMPLE_FILE = new URL("./fixtures/speech-sample.wav", import.meta.url);

// A dev server addresses a server function by the encoded module it was split
// from. A built server addresses it by a hash of the file and export name.
function devFnId(file, exportName) {
  const spec = {
    file: `/src/lib/${file}?tss-serverfn-split`,
    export: `${exportName}_createServerFn_handler`,
  };
  return Buffer.from(JSON.stringify(spec), "utf8").toString("base64url");
}

function prodFnId(file, exportName) {
  const entry = `src/lib/${file}--${exportName}_createServerFn_handler`;
  return createHash("sha256").update(entry).digest("hex");
}

let useProdIds = false;

// Free chat backends often allow one request every 30 seconds per address.
// Spacing the calls keeps the check from tripping that limit, so a failure
// means the backend is broken rather than throttled.
const CHAT_SPACING_MS = Number(process.env.CHAT_SPACING_MS ?? 32000);
let lastChatAt = 0;

async function waitForChatSlot() {
  if (!CHAT_SPACING_MS) return;
  const wait = lastChatAt + CHAT_SPACING_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastChatAt = Date.now();
}

// Mirrors the browser's client-RPC transport: a seroval cross-JSON body, the
// server-function marker header, and a same-origin Origin so the app's CSRF
// middleware accepts the request.
async function call(file, exportName, data, method = "POST") {
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
  const id = useProdIds ? prodFnId(file, exportName) : devFnId(file, exportName);
  const response = await fetch(`${APP_URL}/_serverFn/${id}`, { method, headers, body });
  const text = await response.text();
  if (!response.ok) {
    // A built server only knows the hashed ids, so retry once with them.
    if (!useProdIds) {
      useProdIds = true;
      return call(file, exportName, data, method);
    }
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

// A call that fails because the backend was busy or the connection dropped is
// tried once more, so a hiccup is not reported as a broken app. The app
// itself already retries inside the server function, and a rate-limited
// provider asks for a few seconds.
async function callChat(file, exportName, data, attempts = 2) {
  let result = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await call(file, exportName, data);
    if (result?.error !== "failed") return result;
    if (attempt < attempts) {
      console.log("      the backend did not answer, trying once more");
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }
  }
  return result;
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
await waitForChatSlot();
const english = await callChat("farmer-chat.functions.ts", "askFarmerAssistant", {
  district: "Musanze",
  soil: "Volcanic",
  language: "en",
  messages: [{ role: "user", content: "How do I improve maize yields after heavy rain?" }],
});
check("answer returned", Boolean(english?.answer), english?.answer?.slice(0, 80));
check("no error reported", english?.error === null, english?.error ?? "");

console.log("3/5 Farmer Q&A (Kinyarwanda)");
await waitForChatSlot();
const kinyarwanda = await callChat("farmer-chat.functions.ts", "askFarmerAssistant", {
  district: "Musanze",
  soil: "Volcanic",
  language: "rw",
  messages: [{ role: "user", content: "Esekeza umugunda w'ibigega?" }],
});
check("answer returned", Boolean(kinyarwanda?.answer), kinyarwanda?.answer?.slice(0, 80));
check("no error reported", kinyarwanda?.error === null, kinyarwanda?.error ?? "");

console.log("4/5 Season explanation");
await waitForChatSlot();
const season = await callChat("season-assistant.functions.ts", "explainSeason", {
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
// The clip to transcribe: the answer the backend just spoke, or the committed
// sample when the backend cannot read aloud. Either way the farmer's recording
// is checked through the app's own server function.
let clip = null;
if (spoken?.error === "unavailable") {
  // The backend is reachable but cannot serve spoken output, for example a plan
  // or terms limit. The server reports it, and the page shows no error: the
  // answer simply stays written. The refusal says what to fix on the host.
  check("backend reports spoken output as unavailable rather than failing", true);
  console.log(
    `      the backend cannot read answers aloud${spoken?.refusal ? ` (reason: ${spoken.refusal})` : ""}`,
  );
  console.log("      the page shows no error; answers stay written");
  if (spoken?.refusal === "terms") {
    console.log("      the speech model's terms are not accepted yet in the provider console");
  } else if (spoken?.refusal === "plan") {
    console.log("      the provider plan does not include speech");
  } else if (spoken?.refusal === "auth") {
    console.log("      the provider refused the credential");
  } else if (spoken?.refusal === "model") {
    console.log("      the provider does not serve that speech model name");
  } else if (spoken?.refusal === "request") {
    console.log("      the speech endpoint rejected the request; check the model and voice names");
  }
} else {
  const clips = spoken?.audios ?? [];
  const audioBytes = clips.reduce((total, piece) => total + Buffer.from(piece, "base64").length, 0);
  check(
    "speech synthesised",
    audioBytes > 0,
    `${clips.length} clip(s), ${audioBytes} bytes, ${spoken?.mimeType}`,
  );
  clip = { audioBase64: clips[0], mimeType: spoken?.mimeType };
}

// A farmer's recorded question must be transcribed even when the backend
// cannot read answers aloud, so the sample the backend could not speak is used
// instead.
if (!clip) {
  const sample = await readFile(SAMPLE_FILE);
  clip = { audioBase64: sample.toString("base64"), mimeType: "audio/wav" };
  console.log("      the recorded sample is transcribed instead of a spoken answer");
}
const transcript = await call("voice-assistant.functions.ts", "transcribeFarmerSpeech", {
  audioBase64: clip.audioBase64,
  mimeType: clip.mimeType,
  language: "en",
});
check("speech transcribed", Boolean(transcript?.text), transcript?.text);
// The tiny local ASR model can mishear a word, so match on a word it rarely
// gets wrong rather than on the crop name.
check("transcript mentions drainage", /drain/i.test(transcript?.text ?? ""));

// The transcribed question is answered by the voice assistant, so the whole
// spoken path a farmer uses is checked: record, transcribe, answer.
await waitForChatSlot();
const voiceAnswer = await callChat("voice-assistant.functions.ts", "askVoiceAssistant", {
  district: "Musanze",
  soil: "Volcanic",
  language: "en",
  messages: [
    { role: "user", content: transcript?.text ?? "Maize needs good drainage after heavy rain." },
  ],
});
check("voice answer returned", Boolean(voiceAnswer?.answer), voiceAnswer?.answer?.slice(0, 80));
check("no error reported", voiceAnswer?.error === null, voiceAnswer?.error ?? "");

console.log("");
if (failures > 0) {
  console.error(`FAILED: ${failures} check(s) did not pass.`);
  process.exit(1);
}
console.log("END-TO-END OK: the app's server functions answered on the configured backends");
