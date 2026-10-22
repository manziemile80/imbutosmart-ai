import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The guidance page hosts the farmer's assistants, so the server functions are
// replaced with the answers a backend would give.
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/farmer-chat.functions", () => ({
  askFarmerAssistant: async () => ({ answer: "", error: "failed" }),
}));
vi.mock("@/lib/voice-assistant.functions", () => ({
  getVoiceConfigStatus: async () => ({ configured: true, spokenLanguages: ["en"] }),
  speakFarmerText: async () => ({ audios: [], mimeType: "", error: "unavailable", refusal: null }),
  transcribeFarmerSpeech: async () => ({ text: "", error: "unavailable", refusal: null }),
  askVoiceAssistant: async () => ({ answer: "", error: "failed" }),
}));
vi.mock("@/lib/season-assistant.functions", () => ({
  explainSeason: async () => ({ answer: "", error: "failed" }),
}));
vi.mock("@/lib/weather.functions", () => ({
  getDistrictWeather: async () => ({ district: "Musanze", climate: null, forecast: null }),
}));

const { Guidance } = await import("@/components/GuidancePage");

afterEach(cleanup);

describe("guidance page", () => {
  it("offers every way of getting help in plain words", () => {
    render(<Guidance />);

    expect(screen.getByRole("region", { name: /Ask about your farm/i })).toBeInTheDocument();
    expect(screen.getByTestId("guidance-mode-voice")).toBeInTheDocument();
    expect(screen.getByTestId("guidance-mode-season")).toBeInTheDocument();
    expect(screen.getByTestId("guidance-mode-plan")).toBeInTheDocument();
  });

  it("switches to the assistant that was asked for", () => {
    render(<Guidance />);

    fireEvent.click(screen.getByTestId("guidance-mode-season"));
    expect(screen.getByRole("region", { name: /Seasons & rainfall/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("guidance-mode-plan"));
    expect(screen.getByTestId("guidance-plan")).toBeInTheDocument();
  });

  it("keeps the guide for a good answer on the page", () => {
    render(<Guidance />);

    expect(screen.getByTestId("guidance-guide")).toBeInTheDocument();
    expect(screen.getByText(/Say where your field is/i)).toBeInTheDocument();
  });
});
