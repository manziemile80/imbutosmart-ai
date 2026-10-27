import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// The app is read on a phone in a field, often in bright sun and with wet
// hands, and on a tablet or a desktop at a desk. These checks keep the frame,
// the touch targets and the wrapping that make both comfortable from drifting.

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const shell = readFileSync(resolve(process.cwd(), "src/components/SiteShell.tsx"), "utf8");
const menu = readFileSync(resolve(process.cwd(), "src/components/SiteMenu.tsx"), "utf8");
const root = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");

function block(selector: string): string {
  const index = css.indexOf(selector);
  expect(index, `${selector} is missing`).toBeGreaterThanOrEqual(0);
  const start = css.indexOf("{", index);
  const end = css.indexOf("}", start);
  return css.slice(start + 1, end);
}

describe("a phone-first frame", () => {
  it("keeps a gutter that clears the notch on both sides", () => {
    const rootBlock = block(":root {");
    expect(rootBlock).toContain("--edge-left: max(var(--gutter), env(safe-area-inset-left, 0px))");
    expect(rootBlock).toContain(
      "--edge-right: max(var(--gutter), env(safe-area-inset-right, 0px))",
    );
  });

  it("shares one gutter between the header, the pages and the footer", () => {
    expect(block(".app-gutter {")).toContain("var(--edge-left)");
    expect(block(".page {")).toContain("var(--edge-left)");
    expect(block(".app-footer {")).toContain("env(safe-area-inset-bottom, 0px)");
    expect(shell.match(/app-gutter/g)?.length).toBe(2);
    expect(shell).toContain('className="app-footer"');
  });

  it("widens the frame once the screen has room", () => {
    expect(css).toMatch(/@media \(min-width: 40rem\)[\s\S]{0,120}--gutter: 1\.25rem/);
  });

  it("draws under the notch so those insets are real", () => {
    expect(root).toContain("viewport-fit=cover");
  });

  it("grows the small choices to a finger's size on a touch screen", () => {
    const coarse = css.slice(css.indexOf("@media (pointer: coarse)"));
    expect(coarse).toContain("min-height: 2.75rem");
    expect(coarse).toContain(".language-trigger");
    expect(coarse).toContain(".tab");
    expect(coarse).toContain(".chip");
  });

  it("shows the full menu as soon as a tablet has room for it", () => {
    expect(shell).toContain("md:flex");
    expect(menu).toContain("md:hidden");
  });

  it("wraps a long title or label instead of running past the frame", () => {
    expect(block(".page-title {")).toContain("overflow-wrap: break-word");
    expect(block(".section-title {")).toContain("overflow-wrap: break-word");
    expect(block(".stat-label {")).toContain("overflow-wrap: break-word");
    expect(block("body {")).toContain("overflow-wrap: break-word");
  });

  it("lets the page title grow between a phone and a desktop", () => {
    expect(block(".page-title {")).toContain("clamp(");
    expect(block(".section-title {")).toContain("clamp(");
  });
});
