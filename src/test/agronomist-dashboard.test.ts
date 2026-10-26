import { describe, expect, it } from "vitest";

import {
  buildActivityCsv,
  contactSpecializations,
  filterContacts,
  filterRecords,
  forecastRisks,
  formatRwf,
  isAgronomistClaims,
  overviewCounts,
  parseRecordData,
  whatsappLink,
  type AgronomistRecord,
  type RecordData,
  type RecordKind,
} from "@/lib/agronomist-dashboard";
import { DEMO_AGRONOMIST, isAgronomistEmail, isDemoAgronomist } from "@/lib/agronomist-accounts";
import type { DistrictWeather } from "@/lib/weather";

function record(
  kind: RecordKind,
  data: RecordData,
  id = `${kind}-1`,
  updatedAt = "2026-10-20T09:00:00.000Z",
): AgronomistRecord {
  return {
    id,
    kind,
    data,
    createdBy: "user-1",
    createdByName: "Officer",
    updatedBy: "user-1",
    updatedByName: "Officer",
    createdAt: updatedAt,
    updatedAt,
  };
}

function weather(days: number[]): DistrictWeather {
  return {
    district: "Musanze",
    climate: null,
    forecast: {
      district: "Musanze",
      source: "Open-Meteo",
      sourceUrl: "https://open-meteo.com",
      issuedAt: "2026-10-26T06:00:00.000Z",
      days: days.map((rainMm, index) => ({
        date: `2026-10-${String(27 + index).padStart(2, "0")}`,
        rainMm,
        tempMinC: 15,
        tempMaxC: 24,
        maxChanceOfRain: 40,
        rainWindow: null,
        weatherCode: 61,
      })),
    },
  };
}

describe("agronomist record schemas", () => {
  it("refuses a price without its supplier, source and check date", () => {
    const result = parseRecordData("product", {
      category: "fertilizer",
      name: "NPK 17-17-17",
      priceRwf: 1200,
      priceUnit: "kg",
      supplier: "",
      source: "",
      priceUpdatedAt: null,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a verified price that names its supplier, source and date", () => {
    const result = parseRecordData("product", {
      category: "fertilizer",
      name: "NPK 17-17-17",
      priceRwf: 1200,
      priceUnit: "kg",
      supplier: "Musanze cooperative",
      source: "Price list checked at the shop",
      priceUpdatedAt: "2026-10-20",
      verified: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ priceRwf: 1200, verified: true });
    }
  });

  it("requires a recorded district for a contact and a farmer", () => {
    expect(parseRecordData("contact", { fullName: "Aline" }).success).toBe(false);
    expect(parseRecordData("farmer", { fullName: "Jean", soil: "Volcanic" }).success).toBe(false);
  });

  it("accepts a farmer with a valid district and soil", () => {
    const result = parseRecordData("farmer", {
      fullName: "Jean",
      district: "Musanze",
      soil: "Volcanic",
      challenges: "Late rain",
    });

    expect(result.success).toBe(true);
  });
});

describe("contact filtering", () => {
  const contacts = [
    record("contact", {
      fullName: "Aline Uwase",
      district: "Musanze",
      specialization: "Soil fertility",
      sector: "Busogo",
      workplace: "District office",
    }),
    record("contact", {
      fullName: "Eric Habimana",
      district: "Huye",
      specialization: "Horticulture",
      sector: "Tumba",
      workplace: "RAB station",
    }),
    record("farmer", { fullName: "Aline farmer", district: "Musanze", soil: "Volcanic" }),
  ];

  it("filters by district and specialisation", () => {
    expect(
      filterContacts(contacts, "", "Musanze", "").map((item) => item.data["fullName"]),
    ).toEqual(["Aline Uwase"]);
    expect(filterContacts(contacts, "", "", "Horticulture").map((item) => item.id)).toEqual([
      "contact-1",
    ]);
  });

  it("searches only contact records, never farmer records with the same name", () => {
    const visible = filterContacts(contacts, "Aline", "", "");

    expect(visible).toHaveLength(1);
    expect(visible[0]?.kind).toBe("contact");
  });

  it("lists the specialisations that were actually recorded", () => {
    expect(contactSpecializations(contacts)).toEqual(["Horticulture", "Soil fertility"]);
  });

  it("searches every text field of a record", () => {
    expect(filterRecords(contacts, "Busogo")).toHaveLength(1);
    expect(filterRecords(contacts, "missing")).toHaveLength(0);
  });
});

describe("overview counts", () => {
  const records = [
    record("farmer", { fullName: "Jean", district: "Musanze", soil: "Volcanic" }),
    record("farmer", { fullName: "Claudine", district: "Huye", soil: "Clay" }),
    record("contact", { fullName: "Aline", district: "Musanze" }),
    record("recommendation", { crop: "Maize", status: "pending" }),
    record("recommendation", { crop: "Beans", status: "approved" }),
    record("pest", { crop: "Maize", status: "open", severity: "high" }),
    record("pest", { crop: "Beans", status: "closed", severity: "low" }),
    record("message", { subject: "Hello", status: "sent" }),
    record("followUp", { farmerName: "Jean", status: "done" }),
    record("product", { name: "Urea" }),
    record("insurance", { productName: "NAIS" }),
  ];

  it("counts the five overview figures from stored records only", () => {
    const counts = overviewCounts(records);

    expect(counts.farmers).toBe(2);
    expect(counts.agronomists).toBe(1);
    expect(counts.recommendations).toBe(2);
    expect(counts.pendingRecommendations).toBe(1);
    expect(counts.pendingRequests).toBe(2);
    expect(counts.highSeverityPests).toBe(1);
    expect(counts.products).toBe(1);
    expect(counts.insuranceProducts).toBe(1);
  });
});

describe("forecast risk signals", () => {
  it("names heavy-rain days and combines them with the district erosion indicator", () => {
    const risks = forecastRisks(weather([40, 5, 32, 0, 0]), 0.2);

    expect(risks.map((risk) => risk.kind)).toContain("heavy-rain");
    expect(risks.map((risk) => risk.kind)).toContain("erosion");
    expect(risks[0]?.detail).toContain("30 mm or more");
  });

  it("flags a dry five-day forecast without calling it a drought", () => {
    const risks = forecastRisks(weather([0, 0, 1, 0, 1]), 0.02);

    expect(risks).toHaveLength(1);
    expect(risks[0]?.kind).toBe("dry-week");
    expect(risks[0]?.detail).toContain("not a drought declaration");
  });

  it("returns no signal when there is no forecast rather than estimating one", () => {
    expect(forecastRisks({ district: "Musanze", climate: null, forecast: null }, 0.5)).toEqual([]);
  });
});

describe("report CSV", () => {
  it("writes a header and escapes a comma and a quote", () => {
    const csv = buildActivityCsv([
      record("farmer", {
        fullName: 'Jean "Mukamana", Sr',
        district: "Musanze",
        soil: "Volcanic",
      }),
    ]);

    expect(csv.split("\r\n")[0]).toBe("Module,Record,Status,District,Updated,Updated by,Details");
    expect(csv).toContain('"Jean ""Mukamana"", Sr"');
    expect(csv).toContain("Officer");
  });
});

describe("honest formatting and access", () => {
  it("says a missing price is not recorded instead of showing zero", () => {
    expect(formatRwf(null)).toBe("Not recorded");
    expect(formatRwf(1200)).toBe("RWF 1,200");
  });

  it("trusts only app_metadata for the agronomist role", () => {
    expect(isAgronomistClaims({ app_metadata: { role: "agronomist" } })).toBe(true);
    expect(
      isAgronomistClaims({
        user_metadata: { role: "agronomist" },
      } as unknown as Parameters<typeof isAgronomistClaims>[0]),
    ).toBe(false);
    expect(isAgronomistClaims(null)).toBe(false);
  });

  it("treats the shared reviewer address as an agronomist, and no other address", () => {
    expect(isAgronomistClaims({ email: DEMO_AGRONOMIST.email, app_metadata: {} })).toBe(true);
    expect(isAgronomistClaims({ email: "  MANZIEMILE1@Gmail.com ", app_metadata: {} })).toBe(true);
    expect(isAgronomistClaims({ email: "someone@example.org", app_metadata: {} })).toBe(false);
    expect(isAgronomistClaims({ app_metadata: { role: "farmer" }, email: "a@b.rw" })).toBe(false);
  });

  it("keeps the printed shared account to the one address the migration also lists", () => {
    expect(isAgronomistEmail(DEMO_AGRONOMIST.email)).toBe(true);
    expect(isAgronomistEmail("reviewer@example.org")).toBe(false);
    expect(isAgronomistEmail(null)).toBe(false);
    expect(isDemoAgronomist("ManziEmile1@gmail.com")).toBe(true);
    expect(isDemoAgronomist("reviewer@example.org")).toBe(false);
    expect(DEMO_AGRONOMIST.password.length).toBeGreaterThanOrEqual(6);
  });

  it("builds a WhatsApp link only for a usable number", () => {
    expect(whatsappLink("0788123456", "Hello")).toContain("https://wa.me/250788123456");
    expect(whatsappLink("123", "Hello")).toBeNull();
  });
});
