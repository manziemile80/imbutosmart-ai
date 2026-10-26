#!/usr/bin/env node
// Configure the dashboard's Supabase project in one step.
//
//   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
//   npm run setup:supabase
//
// It turns on Email sign-in with auto-confirm, applies both migrations, and
// checks that the records table answers. Every step is idempotent, so running it
// twice is safe. The token is only read from the environment or --token and is
// never written to disk.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const token = arg("token", process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
const project = arg(
  "project",
  process.env.SUPABASE_PROJECT_ID ?? process.env.VITE_SUPABASE_PROJECT_ID ?? "",
).trim();
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").trim();
const publishableKey = (
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ""
).trim();

if (!token) {
  console.error(
    [
      "Missing Supabase access token.",
      "",
      "1. Open https://supabase.com/dashboard/account/tokens and create a token.",
      "2. Run, in PowerShell:",
      '     $env:SUPABASE_ACCESS_TOKEN = "sbp_..."',
      "     npm run setup:supabase",
      "",
      "The token needs access to project " + (project || "<project ref>") + ".",
    ].join("\n"),
  );
  process.exit(1);
}
if (!project) {
  console.error("Missing project ref. Set SUPABASE_PROJECT_ID or pass --project <ref>.");
  process.exit(1);
}

const api = `https://api.supabase.com/v1/projects/${project}`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function call(path, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const detail = typeof body === "string" ? body : (body?.message ?? text);
    throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${detail}`);
  }
  return body;
}

function step(label) {
  console.log(`\n> ${label}`);
}

const migrations = [
  "20261026000000_agronomist_dashboard.sql",
  "20261026010000_agronomist_allowlist.sql",
];

try {
  step("Checking the project and the token");
  const info = await call("");
  console.log(`  project: ${info.name ?? project} (${info.region ?? "region unknown"})`);

  step("Enabling Email sign-in with auto-confirm");
  await call("/config/auth", {
    method: "PATCH",
    body: JSON.stringify({ external_email_enabled: true, mailer_autoconfirm: true }),
  });
  console.log("  Email provider: enabled, confirm email: off");

  for (const file of migrations) {
    step(`Applying ${file}`);
    const sql = await readFile(resolve("supabase/migrations", file), "utf8");
    await call("/database/query", { method: "POST", body: JSON.stringify({ query: sql }) });
    console.log("  applied");
  }

  step("Checking the records table over the public API");
  if (!supabaseUrl || !publishableKey) {
    console.log("  skipped: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to check from here");
  } else {
    const response = await fetch(`${supabaseUrl}/rest/v1/agronomist_records?select=id&limit=1`, {
      headers: { apikey: publishableKey },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`the table still does not answer (${response.status}): ${detail}`);
    }
    console.log("  the table answers: agronomist_records is ready");
  }

  console.log(
    [
      "",
      "Done. Open /dashboard and sign in with the shared reviewer account.",
      "The first sign-in creates the account; the allowlist migration grants it write access.",
    ].join("\n"),
  );
} catch (error) {
  console.error(`\nSetup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
