import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutoPrediction } from "@/hooks/use-auto-prediction";
import { predict } from "@/lib/api";

vi.mock("@/lib/api", async (original) => ({ ...await original<typeof import("@/lib/api")>(), predict: vi.fn() }));
const answer = { recommended_crop: "Maize", confidence: 0.9, expected_yield_t_ha: 2.4, alternatives: [] };
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe("automatic field recommendations", () => {
  it("requests a new recommendation when district changes", async () => {
    vi.useFakeTimers(); vi.mocked(predict).mockResolvedValue(answer);
    const { rerender } = renderHook(({ district }) => useAutoPrediction(district, "Volcanic", "450", "19"), { initialProps: { district: "Musanze" } });
    await act(() => vi.advanceTimersByTimeAsync(250));
    rerender({ district: "Ngoma" });
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(predict).toHaveBeenLastCalledWith({ district: "Ngoma", soil_type: "Volcanic", forecast_rain_mm: 450, forecast_temp_c: 19 });
    expect(predict).toHaveBeenCalledTimes(2);
  });
  it("requests a new recommendation when soil changes", async () => {
    vi.useFakeTimers(); vi.mocked(predict).mockResolvedValue(answer);
    const { rerender } = renderHook(({ soil }) => useAutoPrediction("Ngoma", soil, "450", "19"), { initialProps: { soil: "Volcanic" } });
    await act(() => vi.advanceTimersByTimeAsync(250));
    rerender({ soil: "Sandy" });
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(predict).toHaveBeenLastCalledWith({ district: "Ngoma", soil_type: "Sandy", forecast_rain_mm: 450, forecast_temp_c: 19 });
    expect(predict).toHaveBeenCalledTimes(2);
  });
  it("does not submit empty weather input", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAutoPrediction("Ngoma", "Sandy", "", "19"));
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(predict).not.toHaveBeenCalled();
    expect(result.current.error).toBe("invalid");
  });
  it("ignores an older result after a newer request", async () => {
    vi.useFakeTimers();
    let resolveOld: (value: typeof answer) => void = () => {};
    vi.mocked(predict).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValue(answer);
    const { rerender, result } = renderHook(({ soil }) => useAutoPrediction("Ngoma", soil, "450", "19"), { initialProps: { soil: "Volcanic" } });
    await act(() => vi.advanceTimersByTimeAsync(250));
    rerender({ soil: "Sandy" });
    await act(() => vi.advanceTimersByTimeAsync(250));
    await act(async () => resolveOld({ ...answer, recommended_crop: "Wheat" }));
    expect(result.current.result?.recommended_crop).toBe("Maize");
  });
});