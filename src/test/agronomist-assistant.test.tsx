import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const askAgronomist = vi.fn(async (_input: unknown) => ({
  answer: "Start with the irrigation figure.",
  error: null,
}));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/agronomist-chat.functions", () => ({
  askAgronomist: (input: unknown) => askAgronomist(input),
}));
vi.mock("@/lib/voice-assistant.functions", () => ({
  getVoiceConfigStatus: async () => ({ configured: true, spokenLanguages: ["en"] }),
  speakFarmerText: async () => ({ audios: [], mimeType: "", error: "unavailable", refusal: null }),
  transcribeFarmerSpeech: async () => ({ text: "", error: "unavailable", refusal: null }),
  askVoiceAssistant: async () => ({ answer: "", error: "failed" }),
}));

const { AgronomistAssistant } = await import("@/components/AgronomistAssistant");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("agronomist assistant", () => {
  it("is a labelled region of the dashboard", () => {
    render(
      <AgronomistAssistant district="Musanze" season="B" onSeasonChange={() => {}} stats={null} />,
    );

    expect(
      screen.getByRole("region", { name: /Ask about the figures on this page/i }),
    ).toBeInTheDocument();
  });

  it("answers from the figures of the selected district and season", async () => {
    render(
      <AgronomistAssistant
        district="Musanze"
        season="B"
        onSeasonChange={() => {}}
        stats={{ by_crop: [], by_period: [], metrics: { rows: 51225 } }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/type your question/i), {
      target: { value: "Which crop performed best?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/ }));

    await waitFor(() => {
      expect(askAgronomist).toHaveBeenCalled();
    });
    const input = askAgronomist.mock.calls[0]?.[0] as unknown as {
      data: { district: string; season: string; model: { rows: number } };
    };
    expect(input.data.district).toBe("Musanze");
    expect(input.data.season).toBe("B");
    expect(input.data.model.rows).toBe(51225);
    expect(await screen.findByText(/Start with the irrigation figure/)).toBeInTheDocument();
  });

  it("offers the example questions before anything is asked", () => {
    render(
      <AgronomistAssistant
        district="Musanze"
        season={null}
        onSeasonChange={() => {}}
        stats={null}
      />,
    );

    expect(screen.getByText(/Which crops performed best per hectare/i)).toBeInTheDocument();
  });
});
