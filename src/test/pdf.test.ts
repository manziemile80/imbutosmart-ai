import { describe, expect, it } from "vitest";

import { buildPdfDocument, type PdfBlock } from "@/lib/pdf";

function asText(file: Uint8Array): string {
  return new TextDecoder("latin1").decode(file);
}

describe("PDF writer", () => {
  it("writes a complete PDF a reader can open", () => {
    const file = buildPdfDocument([{ kind: "title", text: "Your summary" }]);
    const pdf = asText(file);

    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    expect(pdf).toContain("/Type /Catalog");
    expect(pdf).toContain("/Type /Pages");
    expect(pdf).toContain("/Type /Page ");
    expect(pdf).toContain("/BaseFont /Helvetica");
    expect(pdf).toContain("(Your summary) Tj");
  });

  it("points every cross-reference at the object it describes", () => {
    const pdf = asText(buildPdfDocument([{ kind: "body", text: "Hello" }]));

    const startxref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");

    const rows = pdf
      .slice(startxref)
      .split("\n")
      .filter((line) => /^\d{10} 00000 n $/.test(line));
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row, index) => {
      const offset = Number(row.slice(0, 10));
      expect(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true);
    });
  });

  it("keeps text inside the page by wrapping it", () => {
    const long = "word ".repeat(400).trim();
    const pdf = asText(buildPdfDocument([{ kind: "body", text: long }]));

    // The content is broken into many short text-showing operations, none of
    // which runs off the A4 column.
    expect(pdf.match(/\) Tj/g)?.length).toBeGreaterThan(10);
    for (const line of pdf.match(/\((.*?)\) Tj/g) ?? []) {
      expect(line.length).toBeLessThan(120);
    }
  });

  it("adds a page when the text runs past the bottom of the sheet", () => {
    const blocks: PdfBlock[] = Array.from({ length: 80 }, (_, index) => ({
      kind: "body",
      text: `Line ${index + 1}`,
    }));
    const pdf = asText(buildPdfDocument(blocks));

    expect(Number(/\/Count (\d+)/.exec(pdf)?.[1])).toBeGreaterThan(1);
  });

  it("escapes parentheses so a stray bracket cannot break the file", () => {
    const pdf = asText(buildPdfDocument([{ kind: "body", text: "DAP (50 kg) \\ urea" }]));

    expect(pdf).toContain("(DAP \\(50 kg\\) \\\\ urea) Tj");
  });

  it("writes accented and typographic text in WinAnsi", () => {
    const pdf = asText(buildPdfDocument([{ kind: "body", text: "Préparé — l’enquête NISR" }]));

    // Latin-1 letters and the em dash and curly apostrophe become WinAnsi
    // octals, so the file stays valid whatever the reader's encoding.
    expect(pdf).toContain("Pr\\351par\\351 \\227 l\\222enqu\\352te NISR");
    expect(pdf).not.toContain("é");
  });
});
