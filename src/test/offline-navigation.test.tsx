import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The hook only needs the router's preload call, so the router is stubbed. It
// lives on `vi.hoisted` because a vi.mock factory is hoisted above module scope.
const { router } = vi.hoisted(() => ({ router: { preloadRoute: vi.fn() } }));

vi.mock("@tanstack/react-router", () => ({ useRouter: () => router }));

const { useRouteWarmup } = await import("@/hooks/use-route-warmup");

const MENU_ROUTES = ["/", "/advice", "/summary", "/guidance", "/dashboard"];

function Warmup() {
  useRouteWarmup();
  return null;
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: online });
}

beforeEach(() => {
  vi.useFakeTimers();
  router.preloadRoute.mockReset();
  router.preloadRoute.mockResolvedValue(undefined);
  setOnline(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  setOnline(true);
});

describe("offline navigation", () => {
  it("keeps every menu page ready before the farmer needs it", () => {
    render(<Warmup />);

    // The page on screen is left to paint first.
    expect(router.preloadRoute).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(router.preloadRoute.mock.calls.map(([options]) => options.to)).toEqual(MENU_ROUTES);
  });

  it("waits for the connection instead of fetching while offline", () => {
    setOnline(false);
    render(<Warmup />);

    vi.advanceTimersByTime(1000);
    expect(router.preloadRoute).not.toHaveBeenCalled();

    // Back online: the pages the farmer has not opened yet are warmed then.
    setOnline(true);
    fireEvent(window, new Event("online"));

    expect(router.preloadRoute.mock.calls.map(([options]) => options.to)).toEqual(MENU_ROUTES);
  });

  it("stays quiet when a page cannot be fetched", async () => {
    router.preloadRoute.mockRejectedValue(new Error("offline"));
    render(<Warmup />);

    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(router.preloadRoute).toHaveBeenCalledTimes(MENU_ROUTES.length);
  });

  it("stops warming once the page is gone", () => {
    const { unmount } = render(<Warmup />);

    unmount();
    vi.advanceTimersByTime(1000);

    expect(router.preloadRoute).not.toHaveBeenCalled();
  });
});
