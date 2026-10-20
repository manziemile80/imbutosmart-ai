// Lists the voices the configured ElevenLabs account can use, so one can be
// copied into ELEVENLABS_VOICE_ID.
//
// Usage: node scripts\list-elevenlabs-voices.mjs
//
// The account needs a key with the voices_read permission. The key can also be
// given for one run:  $env:ELEVENLABS_API_KEY="sk_..."; node scripts\list-elevenlabs-voices.mjs

import { readFileSync } from "node:fs";

function readEnvFile() {
  let raw = "";
  try {
    raw = readFileSync(".env", "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (key.startsWith("VITE_")) continue;
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[key]) process.env[key] = value;
  }
}
readEnvFile();

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is not set. Add it to .env or pass it in the environment.");
  process.exit(1);
}

const baseURL = (process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").replace(
  /\/+$/,
  "",
);
const response = await fetch(`${baseURL}/v2/voices?page_size=100`, {
  headers: { "xi-api-key": apiKey },
});

if (!response.ok) {
  const detail = await response.text().catch(() => "");
  console.error(`Could not list voices (${response.status}): ${detail}`);
  console.error(
    "The key needs the voices_read permission. Create a scoped key with it in the ElevenLabs dashboard.",
  );
  process.exit(1);
}

const payload = await response.json();
const voices = Array.isArray(payload.voices) ? payload.voices : [];
if (voices.length === 0) {
  console.log(
    "This account has no voices yet. Create one in the ElevenLabs app, then run this again.",
  );
  process.exit(0);
}

console.log(`Voices available to this account (${voices.length}):\n`);
for (const voice of voices) {
  const labels = voice.labels ?? {};
  const detail = [labels.accent, labels.gender, labels.language, labels.age]
    .filter(Boolean)
    .join(" · ");
  console.log(`  ${voice.voice_id}  ${voice.name}${detail ? `  (${detail})` : ""}`);
}
console.log("\nCopy a voice id into ELEVENLABS_VOICE_ID in .env.");
