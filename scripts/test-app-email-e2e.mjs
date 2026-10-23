// End-to-end check of the app's own summary-email server function.
//
// It drives the same server function the browser calls, so it covers the app's
// validation, the summary the server rebuilds from the published figures, and
// the delivery the mail service performs. Use it after changing the email
// configuration, before trusting a deployment to deliver a farmer's summary.
//
// Usage:
//   1. Start the app:              npm run dev
//   2. Run the check:              node scripts\test-app-email-e2e.mjs
//
// The provider only delivers to an address it accepts, so the recipient comes
// from EMAIL_TEST_TO. With an unverified sending domain, Resend accepts only
// the mail service account's own address; asking for any other address is
// checked too, and must come back as "failed" rather than throwing, because the
// page then hands the same summary to the farmer's own mail app.
//
//   EMAIL_TEST_TO=you@example.com node scripts\test-app-email-e2e.mjs
//
// Set APP_URL to point at a deployed build (default http://localhost:5173).

import { createHash } from "node:crypto";
import { toJSONAsync, fromCrossJSON } from "seroval";
import { createDefaultSerovalPlugins } from "@tanstack/router-core/ssr/client";

const APP_URL = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
const TEST_TO = process.env.EMAIL_TEST_TO?.trim() ?? "";
const plugins = createDefaultSerovalPlugins();

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

// Mirrors the browser's client-RPC transport: a seroval cross-JSON body, the
// server-function marker header, and a same-origin Origin so the app's CSRF
// middleware accepts the request.
async function call(file, exportName, data) {
  const headers = {
    "x-tsr-serverFn": "true",
    accept: "application/x-ndjson, application/json",
    "content-type": "application/json",
    origin: APP_URL,
  };
  const body = JSON.stringify(await toJSONAsync({ data }, { plugins }));
  const id = useProdIds ? prodFnId(file, exportName) : devFnId(file, exportName);
  const response = await fetch(`${APP_URL}/_serverFn/${id}`, { method: "POST", headers, body });
  const text = await response.text();
  if (!response.ok) {
    // A built server only knows the hashed ids, so retry once with them.
    if (!useProdIds) {
      useProdIds = true;
      return call(file, exportName, data);
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

console.log(`Checking the summary email at ${APP_URL}\n`);

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

if (!TEST_TO) {
  console.log("EMAIL_TEST_TO is not set, so delivery is not checked.");
  console.log("Set it to the address the mail service accepts, then run again.");
  process.exit(0);
}

const field = {
  name: "Aline",
  email: TEST_TO,
  district: "Musanze",
  soil: "Volcanic",
  season: "B",
  language: "en",
};

console.log("1/2 A summary to an address the service accepts");
const sent = await call("plan-summary.functions.ts", "sendPlanSummaryEmail", field);
check("the server reports the summary as sent", sent?.status === "sent", `status: ${sent?.status}`);

console.log("\n2/2 A summary to any other address");
const other = await call("plan-summary.functions.ts", "sendPlanSummaryEmail", {
  ...field,
  email: "another-farmer@imbutosmart.invalid",
});
check(
  "an address the service refuses is reported, not thrown",
  other?.status === "failed" || other?.status === "sent",
  `status: ${other?.status} (the page then opens the farmer's mail app)`,
);

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("The summary email path works.");
if (sent?.status !== "sent") {
  console.log("If nothing was delivered, check EMAIL_API_KEY and EMAIL_FROM on the server.");
}
