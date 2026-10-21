import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The app-level check transcribes this sample when the speech backend cannot
// read answers aloud, so it has to stay in the repository, and small enough
// that the check stays quick to run.
const SAMPLE = path.resolve(process.cwd(), "scripts/fixtures/speech-sample.wav");

describe("speech sample", () => {
  it("is committed", () => {
    expect(statSync(SAMPLE).size).toBeGreaterThan(0);
  });

  it("stays small", () => {
    expect(statSync(SAMPLE).size).toBeLessThan(500_000);
  });

  it("is a wav clip", () => {
    const header = readFileSync(SAMPLE).subarray(0, 12).toString("latin1");
    expect(header.slice(0, 4)).toBe("RIFF");
    expect(header.slice(8, 12)).toBe("WAVE");
  });
});
