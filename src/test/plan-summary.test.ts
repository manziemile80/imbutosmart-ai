import { afterEach, describe, expect, it } from "vitest";

import {
  buildPlanEmail,
  buildPlanShareText,
  buildPlanSummary,
  isValidPlanEmail,
  isValidPlanName,
  PLAN_EMAIL_STORAGE_KEY,
  PLAN_NAME_STORAGE_KEY,
  planEmailInputSchema,
  readStoredPlanEmail,
  readStoredPlanName,
  storePlanEmail,
  storePlanName,
} from "@/lib/plan-summary";
import { districtInputs } from "@/lib/advice";

const profile = districtInputs["Musanze"] ?? null;

describe("plan summary", () => {
  it("lists the crops, the inputs and the insurance line", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [{ crop: "Maize", score: 86 }],
      profile,
      climate: { rainMm: 953, tempC: 17.4 },
      language: "en",
    });

    expect(summary.crops[0]).toEqual({ crop: "Maize", score: 86 });
    expect(summary.inputs.length).toBeGreaterThan(0);
    expect(summary.inputs[0]?.share).toBeGreaterThan(0);
    expect(summary.insurance).toContain("Insurance");
    expect(summary.insuranceNote).toContain("licensed insurer");
  });

  it("quotes the rate farmers applied the input at", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [],
      profile,
      climate: null,
      language: "en",
    });

    const withRate = summary.inputs.find((input) => input.rateKgPerHa);
    expect(withRate?.rateKgPerHa).toBeGreaterThan(0);
  });

  it("adds advice only from what the district record holds", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [],
      profile,
      climate: null,
      language: "en",
    });

    // Musanze: little irrigation, a quarter of the fields eroded.
    expect(summary.advice.join(" ")).toContain("irrigate");
    expect(summary.advice.join(" ")).toContain("erosion");
    expect(summary.advice.join(" ")).toContain("soil test");
  });

  it("speaks the farmer's language", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [],
      profile,
      climate: null,
      language: "rw",
    });

    expect(summary.insurance).toContain("Ubwishingizi");
    expect(summary.advice[0]).toMatch(/Hingira|hinga/);
  });

  it("shares every part of the summary, not only the preview", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [{ crop: "Maize", score: 86 }],
      profile,
      climate: { rainMm: 953, tempC: 17.4 },
      language: "en",
    });

    const text = buildPlanShareText({
      summary,
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      language: "en",
    });

    expect(text).toContain("Your summary — Musanze");
    expect(text).toContain("Your field: Musanze · Volcanic · Season A");
    expect(text).toContain("Crops for your field");
    expect(text).toContain("Maize — 86%");
    expect(text).toContain("Inputs farmers here use");
    expect(text).toContain(summary.inputs[0]?.name ?? "");
    expect(text).toContain(summary.insuranceNote);
    expect(text).toContain("Also worth doing");
    expect(text).toContain(summary.advice[0] ?? "");
    expect(text).toContain("Shared from ImbutoSmart AI");
  });

  it("shares the summary in the farmer's language", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      crops: [{ crop: "Maize", score: 86 }],
      profile,
      climate: null,
      language: "rw",
    });

    const text = buildPlanShareText({
      summary,
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      language: "rw",
    });

    expect(text).toContain("Incamake yawe — Musanze");
    expect(text).toContain("Umurima wawe");
    expect(text).toContain("Ibigori");
    expect(text).toContain("Igihembwe A");
  });

  it("says plainly when the field has no crops or input figures yet", () => {
    const summary = buildPlanSummary({
      district: "Musanze",
      soil: "Volcanic",
      season: null,
      crops: [],
      profile: null,
      climate: null,
      language: "en",
    });

    const text = buildPlanShareText({
      summary,
      district: "Musanze",
      soil: "Volcanic",
      season: null,
      language: "en",
    });

    expect(text).toContain("No crops have been estimated for this field yet.");
    expect(text).toContain("No input figures have been supplied for this district yet.");
  });
});

describe("summary by email", () => {
  const summary = buildPlanSummary({
    district: "Musanze",
    soil: "Volcanic",
    season: "A",
    crops: [{ crop: "Maize", score: 86 }],
    profile,
    climate: { rainMm: 953, tempC: 17.4 },
    language: "en",
  });

  it("addresses every part of the summary to the farmer by name", () => {
    const email = buildPlanEmail({
      summary,
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      language: "en",
      to: "  farmer@example.com ",
      name: "  Aline  ",
    });

    expect(email.to).toBe("farmer@example.com");
    expect(email.subject).toBe("Your summary — Musanze");
    expect(email.href.startsWith("mailto:farmer@example.com?subject=")).toBe(true);

    const body = decodeURIComponent(email.href.split("&body=")[1] ?? "");
    expect(body.startsWith("Hello Aline,\n\n")).toBe(true);
    expect(body).toContain("Your field: Musanze · Volcanic · Season A");
    expect(body).toContain("Crops for your field");
    expect(body).toContain("Maize — 86%");
    expect(body).toContain("Inputs farmers here use");
    expect(body).toContain("Insurance to ask about");
    expect(body).toContain("Also worth doing");
    expect(body).toContain(summary.advice[0] ?? "");
  });

  it("refuses an incomplete address so the mail app opens nothing", () => {
    expect(isValidPlanEmail("farmer@example.com")).toBe(true);
    expect(isValidPlanEmail(" farmer@example.com ")).toBe(true);
    expect(isValidPlanEmail("farmer@")).toBe(false);
    expect(isValidPlanEmail("farmer.example.com")).toBe(false);
    expect(isValidPlanEmail("")).toBe(false);
  });

  it("asks for the farmer's name, without accepting free text", () => {
    expect(isValidPlanName("Aline")).toBe(true);
    expect(isValidPlanName("  Jean-Paul  ")).toBe(true);
    expect(isValidPlanName("Marie Claire")).toBe(true);
    expect(isValidPlanName("")).toBe(false);
    expect(isValidPlanName("A")).toBe(false);
    expect(isValidPlanName("Aline\nBcc: someone@example.com")).toBe(false);
    expect(isValidPlanName("12345")).toBe(false);
  });

  it("only accepts a field the app can actually send", () => {
    const base = {
      name: "Aline",
      email: "farmer@example.com",
      district: "Musanze",
      soil: "Volcanic",
      season: "A",
      language: "en",
    };
    expect(planEmailInputSchema.safeParse(base).success).toBe(true);
    expect(planEmailInputSchema.safeParse({ ...base, name: "" }).success).toBe(false);
    expect(planEmailInputSchema.safeParse({ ...base, email: "farmer@" }).success).toBe(false);
    expect(planEmailInputSchema.safeParse({ ...base, district: "Nowhere" }).success).toBe(false);
  });
});

describe("email kept on this device", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("offers the address used last time on this device", () => {
    storePlanEmail("  farmer@example.com ");
    expect(window.localStorage.getItem(PLAN_EMAIL_STORAGE_KEY)).toBe("farmer@example.com");
    expect(readStoredPlanEmail()).toBe("farmer@example.com");
  });

  it("ignores anything that is not a complete address", () => {
    storePlanEmail("farmer@");
    expect(readStoredPlanEmail()).toBeNull();

    window.localStorage.setItem(PLAN_EMAIL_STORAGE_KEY, "not-an-address");
    expect(readStoredPlanEmail()).toBeNull();
  });

  it("offers the name used last time on this device", () => {
    storePlanName("  Aline  ");
    expect(window.localStorage.getItem(PLAN_NAME_STORAGE_KEY)).toBe("Aline");
    expect(readStoredPlanName()).toBe("Aline");
  });

  it("ignores anything that is not a name", () => {
    storePlanName("123");
    expect(readStoredPlanName()).toBeNull();

    window.localStorage.setItem(PLAN_NAME_STORAGE_KEY, "Aline\nBcc: someone@example.com");
    expect(readStoredPlanName()).toBeNull();
  });
});
