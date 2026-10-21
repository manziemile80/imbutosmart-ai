// Regenerates the spoken sample used by scripts/test-app-ai-e2e.mjs to check
// the farmer's recording path on a deployment whose speech backend cannot read
// answers aloud.
//
// The sample is produced by the free local speech stack (see
// scripts/start-local-voice.ps1), so it needs no paid provider and no network.
//
// Usage:  node scripts\make-speech-sample.mjs [speechBaseUrl]
//         speechBaseUrl defaults to http://127.0.0.1:8000/v1

import { writeFile } from "node:fs/promises";

const SPEECH_BASE_URL = (
  process.argv[2] ??
  process.env.AI_SPEECH_BASE_URL ??
  "http://127.0.0.1:8000/v1"
).replace(/\/+$/, "");
const TTS_MODEL = process.env.AI_TTS_MODEL ?? "pyttsx3";
// The same sentence the app-level check speaks, so both paths are comparable.
const SAMPLE_TEXT = "Maize needs good drainage after heavy rain.";
const SAMPLE_FILE = new URL("./fixtures/speech-sample.wav", import.meta.url);

const response = await fetch(`${SPEECH_BASE_URL}/audio/speech`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: TTS_MODEL, input: SAMPLE_TEXT, response_format: "wav" }),
});
if (!response.ok) {
  console.error(
    `The speech backend answered ${response.status}: ${(await response.text()).slice(0, 300)}`,
  );
  console.error(
    "Start the local speech stack: powershell -ExecutionPolicy Bypass -File scripts\\start-local-voice.ps1",
  );
  process.exit(1);
}

const audio = Buffer.from(await response.arrayBuffer());
await writeFile(SAMPLE_FILE, audio);
console.log(`Wrote ${audio.length} bytes to scripts/fixtures/speech-sample.wav`);
