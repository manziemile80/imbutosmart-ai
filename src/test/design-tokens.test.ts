import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// A status colour is defined once in the token layer and used by the component
// layer. The danger callout once used the white text meant for a solid red
// button, which made an error message invisible on the pale danger surface.
// These checks keep the two jobs of a destructive colour apart.

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

function block(selector: string): string {
  const index = css.indexOf(selector);
  expect(index, `${selector} is missing`).toBeGreaterThanOrEqual(0);
  const start = css.indexOf("{", index);
  const end = css.indexOf("}", start);
  return css.slice(start + 1, end);
}

describe("status tokens", () => {
  it("gives the danger callout readable ink instead of the button's white", () => {
    const callout = block(".callout-danger");
    expect(callout).toContain("color: var(--destructive-text)");
    expect(callout).not.toContain("--destructive-foreground");
  });

  it("defines the danger ink in both light and dark mode", () => {
    const light = block(":root {");
    const dark = block(".dark {");
    expect(light).toContain("--destructive-text:");
    expect(dark).toContain("--destructive-text:");
  });

  it("keeps the white destructive foreground for buttons and badges", () => {
    const light = block(":root {");
    expect(light).toMatch(/--destructive-foreground:\s*oklch\(1 0 0\)/);
  });
});
