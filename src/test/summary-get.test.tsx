import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FIELD_STORAGE_KEY, type FarmerField } from "@/lib/field";

// The page is checked on its own, with the router stubbed, so the test covers
// the sections and the PDF it offers: no share sheet and no email form.
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
vi.mock("@/lib/weather.functions", () => ({
  getDistrictWeather: async () => ({ district: "Musanze", climate: null, forecast: null }),
}));

const { SummaryGetPage } = await import("@/components/SummaryGetPage");
const { FieldProvider } = await import("@/lib/field-context");

const FIELD: FarmerField = { district: "Musanze", soil: "Volcanic", season: "A" };

beforeEach(() => {
  window.localStorage.setItem(FIELD_STORAGE_KEY, JSON.stringify(FIELD));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  window.localStorage.clear();
});

function renderPage() {
  render(
    <FieldProvider>
      <SummaryGetPage />
    </FieldProvider>,
  );
}

async function ready() {
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Get your summary and keep it" }),
    ).toBeInTheDocument(),
  );
}

describe("Summary get page", () => {
  it("points back to the Farmer page instead of repeating the field controls", async () => {
    renderPage();

    await ready();
    expect(screen.getByText("Your field is set on the Farmer page.")).toBeInTheDocument();
    expect(screen.queryByLabelText("District")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Soil type")).not.toBeInTheDocument();
    // One language selector, in the header.
    expect(screen.getAllByLabelText("Language")).toHaveLength(1);
  });

  it("shows every part of the summary with one way to keep it", async () => {
    renderPage();

    await ready();
    expect(screen.getByRole("heading", { name: "Crops for your field" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inputs farmers here use" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Insurance to ask about" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Also worth doing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download this summary" })).toBeInTheDocument();

    // Sharing and emailing belong to no menu on this page any more.
    expect(screen.queryByRole("button", { name: "Share all of this" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send me this summary" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Your email address")).not.toBeInTheDocument();
  });

  it("downloads the whole summary as a PDF named for the field", async () => {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:summary";
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const downloads: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ href: this.href, download: this.download });
    });

    renderPage();
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "Download this summary" }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.download).toBe("imbutosmart-summary-musanze-season-a.pdf");
    expect(blobs[0]?.type).toBe("application/pdf");
    expect(
      screen.getByText("Summary downloaded. It is ready in your downloads."),
    ).toBeInTheDocument();
  });

  it("says so when the browser cannot download", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => {
        throw new Error("no object URLs");
      }),
    });

    renderPage();
    await ready();

    fireEvent.click(screen.getByRole("button", { name: "Download this summary" }));

    expect(screen.getByRole("alert")).toHaveTextContent("The download did not start. Try again.");
  });
});
