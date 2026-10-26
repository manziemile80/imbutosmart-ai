import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The announcement links to Summary get; the router is stubbed so the test
// renders without a full route tree.
vi.mock("@tanstack/react-router", async () => {
  const { createElement } = await import("react");
  return {
    Link: ({
      to,
      children,
      onClick,
      ...rest
    }: {
      to: string;
      children?: import("react").ReactNode;
      onClick?: (event: import("react").MouseEvent<HTMLAnchorElement>) => void;
    } & Record<string, unknown>) =>
      createElement(
        "a",
        {
          href: to,
          ...rest,
          onClick: (event: import("react").MouseEvent<HTMLAnchorElement>) => {
            // The test router does not navigate; the link's own handler still runs.
            event.preventDefault();
            onClick?.(event);
          },
        },
        children,
      ),
  };
});

const { PlanSummaryMenu } = await import("@/components/PlanSummaryMenu");
const { FieldProvider } = await import("@/lib/field-context");
const { useField } = await import("@/lib/field");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function Harness() {
  const { setField } = useField();
  return (
    <>
      <button type="button" onClick={() => setField({ district: "Nyagatare" })}>
        Change district
      </button>
      <PlanSummaryMenu language="en" />
    </>
  );
}

describe("summary announcement in the header", () => {
  it("announces that the summary is ready for the farmer's district", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveTextContent("Your summary is ready");
    expect(panel).toHaveTextContent("Musanze");
    expect(panel).toHaveTextContent("Open Summary get");
  });

  it("follows the district the farmer changes", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change district" }));
    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Nyagatare");
  });

  it("keeps the figures on the Summary get page, not in the announcement", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    const panel = screen.getByRole("dialog");

    // No figure, no email form: the bell is only the announcement.
    expect(panel).not.toHaveTextContent("DAP");
    expect(panel).not.toHaveTextContent("Crops for your field");
    expect(panel).not.toHaveTextContent("Insurance to ask about");
    expect(screen.queryByLabelText("Your email address")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send me this summary" })).not.toBeInTheDocument();
  });

  it("takes the farmer to Summary get and closes the announcement", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    const open = screen.getByRole("link", { name: "Open Summary get" });
    expect(open).toHaveAttribute("href", "/summary");

    fireEvent.click(open);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when the farmer presses Escape", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
