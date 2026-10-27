import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The announcements link to other pages; the router is stubbed so the test
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
const { useField, LANGUAGE_STORAGE_KEY } = await import("@/lib/field");

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
      <PlanSummaryMenu />
    </>
  );
}

describe("announcements in the header", () => {
  it("lists short notices for the farmer's district", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveTextContent("Announcements");
    expect(panel).toHaveTextContent("All the help, in one place");
    expect(panel).toHaveTextContent("Manure cost");
    expect(panel).toHaveTextContent("Check the season before you plant");
    expect(panel).toHaveTextContent("Musanze");
  });

  it("follows the district the farmer changes", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change district" }));
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Nyagatare");
  });

  it("keeps the figures on their pages, not in the announcement", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    const panel = screen.getByRole("dialog");

    // No summary, no input table and no email form: the bell is only the feed.
    expect(panel).not.toHaveTextContent("Your summary is ready");
    expect(panel).not.toHaveTextContent("Crops for your field");
    expect(panel).not.toHaveTextContent("DAP");
    expect(panel).not.toHaveTextContent("Insurance to ask about");
    expect(panel).not.toHaveTextContent("RWF");
    expect(screen.queryByLabelText("Your email address")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send me this summary" })).not.toBeInTheDocument();
  });

  it("takes the farmer to the page that holds the detail", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    const open = screen.getByRole("link", { name: "Open Guidance" });
    expect(open).toHaveAttribute("href", "/guidance");

    fireEvent.click(open);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("speaks the language chosen once in the header", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "rw");
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Amatangazo" }));

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveTextContent("Ubufasha bwose ahantu hamwe");
    expect(panel).toHaveTextContent("Igiciro cy’ifumbire y’amatungo");
  });

  it("closes when the farmer presses Escape", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
