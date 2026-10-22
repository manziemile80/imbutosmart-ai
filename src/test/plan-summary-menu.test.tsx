import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The summary in the header must follow the farmer's field: when the district
// changes, the summary shows the new district's figures at once.
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/weather.functions", () => ({
  getDistrictWeather: async () => ({ district: "Musanze", climate: null, forecast: null }),
}));

const { PlanSummaryMenu } = await import("@/components/PlanSummaryMenu");
const { FieldProvider } = await import("@/lib/field-context");
const { useField } = await import("@/lib/field");

afterEach(cleanup);

function Harness() {
  const { field, setField } = useField();
  return (
    <>
      <button type="button" onClick={() => setField({ district: "Nyagatare" })}>
        Change district
      </button>
      <PlanSummaryMenu language="en" />
      <span data-testid="district">{field.district}</span>
    </>
  );
}

describe("summary in the header", () => {
  it("opens and shows the farmer's field", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveTextContent("Musanze");
    expect(panel).toHaveTextContent("DAP");
  });

  it("follows the district the farmer changes", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change district" }));
    expect(screen.getByTestId("district")).toHaveTextContent("Nyagatare");

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveTextContent("Nyagatare");
    // Nyagatare uses DAP far more than Musanze does.
    expect(panel).toHaveTextContent("44%");
  });
});
