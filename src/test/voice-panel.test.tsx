import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The voice panel talks to the server through TanStack Start, so the server
// functions are replaced with the answers a backend can give.
const speakFarmerText = vi.fn(
  async (_input: {
    data: { language: string; text: string };
  }): Promise<{
    audios: string[];
    mimeType: string;
    error: string | null;
    refusal: string | null;
  }> => ({ audios: [], mimeType: "", error: "unavailable", refusal: "terms" }),
);

const getVoiceConfigStatus = vi.fn(async () => ({ configured: true, spokenLanguages: ["en"] }));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/voice-assistant.functions", () => ({
  getVoiceConfigStatus: () => getVoiceConfigStatus(),
  speakFarmerText: (input: { data: { language: string; text: string } }) => speakFarmerText(input),
  transcribeFarmerSpeech: async () => ({ text: "", error: "unavailable", refusal: null }),
  askVoiceAssistant: async () => ({ answer: "", error: "failed" }),
}));

const { VoiceAssistant } = await import("@/components/VoiceAssistant");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("voice panel", () => {
  it("explains calmly and stops offering a button when the backend cannot speak", async () => {
    render(<VoiceAssistant district="Musanze" soil="Volcanic" language="en" />);

    const listen = await screen.findByRole("button", { name: /Listen to what you'll need/i });
    fireEvent.click(listen);

    // The answer stays written: the panel says so in a calm status note
    // instead of showing an error the farmer cannot act on.
    await waitFor(() => {
      expect(screen.getByText(/not reading answers aloud/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Listen to what you'll need/i })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the spoken button when only this language is refused", async () => {
    // The backend can speak other languages, so one refusal is not a broken
    // voice service.
    speakFarmerText.mockResolvedValueOnce({
      audios: [],
      mimeType: "",
      error: "unavailable",
      refusal: null,
    });

    render(<VoiceAssistant district="Musanze" soil="Volcanic" language="en" />);
    const listen = await screen.findByRole("button", { name: /Listen to what you'll need/i });
    fireEvent.click(listen);

    await waitFor(() => {
      expect(speakFarmerText).toHaveBeenCalled();
    });
    expect(screen.queryByText(/not reading answers aloud/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Listen to what you'll need/i })).toBeInTheDocument();
  });

  it("never claims the server has no key when the request simply fails", async () => {
    // A failed request says nothing about the server, so the page must not
    // tell the farmer that voice is not set up.
    getVoiceConfigStatus.mockRejectedValueOnce(new Error("network"));
    getVoiceConfigStatus.mockRejectedValueOnce(new Error("network"));

    render(<VoiceAssistant district="Musanze" soil="Volcanic" language="en" />);

    await waitFor(
      () => {
        expect(getVoiceConfigStatus.mock.calls.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 4000 },
    );
    expect(screen.queryByText(/isn't switched on yet/i)).toBeNull();
  });
});
