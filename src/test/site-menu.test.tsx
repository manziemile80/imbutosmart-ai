import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The menu links to other pages; the router is stubbed so the test renders
// without a full route tree. The active path lives on `globalThis` because a
// vi.mock factory is hoisted above any module-scope value it would close over.
vi.mock("@tanstack/react-router", async () => {
  const { createElement } = await import("react");
  return {
    Link: ({
      to,
      children,
      activeProps,
      onClick,
      ...rest
    }: {
      to: string;
      children?: import("react").ReactNode;
      activeProps?: Record<string, unknown>;
      onClick?: (event: import("react").MouseEvent<HTMLAnchorElement>) => void;
    } & Record<string, unknown>) => {
      const active = to === (globalThis as { __activeTo?: string }).__activeTo;
      return createElement(
        "a",
        {
          href: to,
          ...rest,
          ...(active ? { "data-status": "active", ...activeProps } : {}),
          onClick: (event: import("react").MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            onClick?.(event);
          },
        },
        children,
      );
    },
  };
});

const { SiteMenu } = await import("@/components/SiteMenu");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  (globalThis as { __activeTo?: string }).__activeTo = "/";
});

function open() {
  fireEvent.click(screen.getByRole("button"));
  return screen.getByRole("navigation");
}

describe("the header menu", () => {
  it("keeps every page behind one button", () => {
    render(<SiteMenu language="en" />);

    expect(screen.queryByRole("navigation")).toBeNull();

    const nav = open();

    expect(screen.getByRole("button", { name: /menu/i })).toHaveAttribute("aria-expanded", "true");
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Farmer",
      "Advice",
      "File",
      "Guidance",
      "Agronomist",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/advice",
      "/summary",
      "/guidance",
      "/dashboard",
    ]);
  });

  it("marks the page the farmer is on", () => {
    (globalThis as { __activeTo?: string }).__activeTo = "/summary";
    render(<SiteMenu language="en" />);

    const nav = open();
    const current = within(nav).getByRole("link", { name: "File" });

    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("data-status", "active");
    expect(within(nav).getByRole("link", { name: "Advice" })).not.toHaveAttribute("aria-current");
  });

  it("closes on Escape and on a click away", () => {
    render(<SiteMenu language="en" />);

    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation")).toBeNull();

    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("speaks the farmer's language", () => {
    render(<SiteMenu language="rw" />);

    const nav = open();

    expect(within(nav).getByRole("link", { name: "Umuhinzi" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Impuguke" })).toBeInTheDocument();
  });
});
