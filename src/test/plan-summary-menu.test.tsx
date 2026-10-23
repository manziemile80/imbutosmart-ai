import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PLAN_EMAIL_STORAGE_KEY, PLAN_NAME_STORAGE_KEY } from "@/lib/plan-summary";

// The server is stubbed: the tests below cover both a configured mail service
// and the fallback to the farmer's own mail app.
const serverSend = vi.hoisted(() => vi.fn());

// The summary in the header must follow the farmer's field: when the district
// changes, the summary shows the new district's figures at once.
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/weather.functions", () => ({
  getDistrictWeather: async () => ({ district: "Musanze", climate: null, forecast: null }),
}));
vi.mock("@/lib/plan-summary.functions", () => ({
  sendPlanSummaryEmail: (input: unknown) => serverSend(input),
}));

const { PlanSummaryMenu } = await import("@/components/PlanSummaryMenu");
const { FieldProvider } = await import("@/lib/field-context");
const { useField } = await import("@/lib/field");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  serverSend.mockReset();
  serverSend.mockResolvedValue({ status: "unavailable" });
  window.localStorage.clear();
  delete (navigator as { share?: unknown }).share;
  delete (navigator as { clipboard?: unknown }).clipboard;
});

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

  it("shares the whole summary through the share sheet", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change district" }));
    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Share all of this" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const data = share.mock.calls[0]?.[0] as { title: string; text: string };
    expect(data.title).toContain("Nyagatare");
    expect(data.text).toContain("Your field: Nyagatare");
    expect(data.text).toContain("DAP");
    expect(data.text).toContain("Insurance to ask about");
    expect(data.text).toContain("Also worth doing");
    expect(await screen.findByRole("button", { name: "Summary shared" })).toBeInTheDocument();
  });

  it("copies the whole summary when the browser has no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Share all of this" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0]?.[0] as string;
    expect(text).toContain("Crops for your field");
    expect(text).toContain("Inputs farmers here use");
    expect(text).toContain("Insurance to ask about");
    expect(text).toContain("Also worth doing");
    expect(await screen.findByRole("button", { name: "Summary copied" })).toBeInTheDocument();
  });

  it("opens the short email form from the notification button", () => {
    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));

    // The form is short and hidden until the farmer asks to be sent the summary.
    expect(screen.queryByLabelText("Your email address")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send me this summary" }));
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Your email address")).toBeInTheDocument();
  });

  it("falls back to the farmer's mail app when no mail service is configured", async () => {
    const opened: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened.push(this.href);
    });

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change district" }));
    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Send me this summary" }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Aline" } });
    fireEvent.change(screen.getByLabelText("Your email address"), {
      target: { value: "farmer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));

    await waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0]).toContain("mailto:farmer@example.com?subject=");

    const message = decodeURIComponent(opened[0] ?? "");
    expect(message).toContain("Hello Aline,");
    expect(message).toContain("Your field: Nyagatare");
    expect(message).toContain("Crops for your field");
    expect(message).toContain("DAP");
    expect(message).toContain("Insurance to ask about");
    expect(message).toContain("Also worth doing");
    expect(
      await screen.findByText(
        "We could not send it from the app, so your mail app was opened for farmer@example.com with the summary ready to send. If nothing opened, use Share all of this.",
      ),
    ).toBeInTheDocument();
    // The name and address stay on this device for the next summary.
    expect(window.localStorage.getItem(PLAN_EMAIL_STORAGE_KEY)).toBe("farmer@example.com");
    expect(window.localStorage.getItem(PLAN_NAME_STORAGE_KEY)).toBe("Aline");
  });

  it("sends the summary from the app when a mail service is configured", async () => {
    serverSend.mockResolvedValue({ status: "sent" });
    const opened: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened.push(this.href);
    });

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change district" }));
    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Send me this summary" }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Aline" } });
    fireEvent.change(screen.getByLabelText("Your email address"), {
      target: { value: "farmer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));

    expect(
      await screen.findByText(
        "Summary sent to farmer@example.com. Look in your inbox in a few minutes, and in the spam folder if it is not there.",
      ),
    ).toBeInTheDocument();
    // The app delivered it, so no mail draft was opened.
    expect(opened).toHaveLength(0);

    const sent = serverSend.mock.calls[0]?.[0] as {
      data: { name: string; email: string; district: string; soil: string; season: string | null };
    };
    expect(sent.data).toMatchObject({
      name: "Aline",
      email: "farmer@example.com",
      district: "Nyagatare",
    });

    // The same summary can be sent again without reopening the app.
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));
    await waitFor(() => expect(serverSend).toHaveBeenCalledTimes(2));
  });

  it("falls back to the mail app when the mail service fails", async () => {
    serverSend.mockRejectedValue(new Error("offline"));
    const opened: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened.push(this.href);
    });

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Send me this summary" }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Aline" } });
    fireEvent.change(screen.getByLabelText("Your email address"), {
      target: { value: "farmer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));

    await waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0]).toContain("mailto:farmer@example.com?subject=");
  });

  it("remembers the name and address already used on this device", async () => {
    window.localStorage.setItem(PLAN_EMAIL_STORAGE_KEY, "farmer@example.com");
    window.localStorage.setItem(PLAN_NAME_STORAGE_KEY, "Aline");
    const opened: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened.push(this.href);
    });

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Send me this summary" }));

    const address = screen.getByLabelText("Your email address");
    const name = screen.getByLabelText("Your name");
    await waitFor(() => expect(address).toHaveValue("farmer@example.com"));
    await waitFor(() => expect(name).toHaveValue("Aline"));

    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));

    await waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0]).toContain("mailto:farmer@example.com?subject=");
    expect(decodeURIComponent(opened[0] ?? "")).toContain("Hello Aline,");
  });

  it("asks for a name before anything is sent", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Send me this summary" }));
    fireEvent.change(screen.getByLabelText("Your email address"), {
      target: { value: "farmer@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));

    expect(click).not.toHaveBeenCalled();
    expect(serverSend).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your name");
  });

  it("asks for a complete address before sending anything", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Send me this summary" }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Aline" } });
    fireEvent.change(screen.getByLabelText("Your email address"), {
      target: { value: "farmer@" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));

    expect(click).not.toHaveBeenCalled();
    expect(serverSend).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Check the email address");
  });

  it("confirms the summary was sent and keeps the form usable", async () => {
    serverSend.mockResolvedValue({ status: "sent" });

    render(
      <FieldProvider>
        <Harness />
      </FieldProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Your summary" }));
    const notify = screen.getByRole("button", { name: "Send me this summary" });
    fireEvent.click(notify);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Aline" } });
    const address = screen.getByLabelText("Your email address");
    fireEvent.change(address, { target: { value: "farmer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));

    expect(
      await screen.findByText(
        "Summary sent to farmer@example.com. Look in your inbox in a few minutes, and in the spam folder if it is not there.",
      ),
    ).toBeInTheDocument();
    expect(notify).toBeEnabled();

    // The same summary can reach someone else without reopening the app.
    fireEvent.change(address, { target: { value: "neighbour@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send the summary" }));
    await waitFor(() => expect(serverSend).toHaveBeenCalledTimes(2));
    expect(
      (serverSend.mock.calls[1]?.[0] as { data: { email: string } } | undefined)?.data.email,
    ).toBe("neighbour@example.com");
  });
});
