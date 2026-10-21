import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The farmer page is built from panels: one labelled region per topic, so a
// screen reader can jump between them and the page reads the same way on
// every screen size. These checks keep that structure from drifting.
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/season-assistant.functions", () => ({
  explainSeason: async () => ({ answer: "", error: "failed" }),
}));
vi.mock("@/lib/voice-assistant.functions", () => ({
  getVoiceConfigStatus: async () => ({ configured: true, spokenLanguages: ["en"] }),
  speakFarmerText: async () => ({ audios: [], mimeType: "", error: "unavailable", refusal: null }),
  transcribeFarmerSpeech: async () => ({ text: "", error: "unavailable", refusal: null }),
  askVoiceAssistant: async () => ({ answer: "", error: "failed" }),
}));
vi.mock("@/lib/farmer-chat.functions", () => ({
  askFarmerAssistant: async () => ({ answer: "", error: "failed" }),
}));
vi.mock("@/lib/recommendation.functions", () => ({
  recommendCropsOnline: async () => ({ result: null }),
  syncRecommendations: async () => ({ durable: false }),
}));

const { SeasonAssistant } = await import("@/components/SeasonAssistant");
const { InsuranceGuidance } = await import("@/components/InsuranceGuidance");
const { VoiceAssistant } = await import("@/components/VoiceAssistant");
const { FarmerAssistant } = await import("@/components/FarmerAssistant");
const { CropRecommendation } = await import("@/components/CropRecommendation");

afterEach(cleanup);

describe("farmer page structure", () => {
  it("gives every block a labelled region", () => {
    render(
      <>
        <SeasonAssistant district="Musanze" language="en" />
        <InsuranceGuidance district="Musanze" soil="Volcanic" language="en" />
        <CropRecommendation district="Musanze" soil="Volcanic" rain="450" temp="19" language="en" />
        <VoiceAssistant district="Musanze" soil="Volcanic" language="en" />
        <FarmerAssistant district="Musanze" soil="Volcanic" language="en" />
      </>,
    );

    expect(screen.getByRole("region", { name: /Seasons & rainfall/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Protect your harvest/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Crop recommendation/i })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /Talk to your farm assistant/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Ask about your farm/i })).toBeInTheDocument();
  });

  it("keeps the same structure in every farmer language", () => {
    render(<SeasonAssistant district="Musanze" language="rw" />);

    expect(screen.getByRole("region", { name: /Ibihembwe n’imvura/i })).toBeInTheDocument();
  });

  it("shows the mode of the recommendation as a status, not an error", () => {
    render(
      <CropRecommendation district="Musanze" soil="Volcanic" rain="450" temp="19" language="en" />,
    );

    expect(screen.getByTestId("recommendation-mode")).toHaveAttribute("role", "status");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
