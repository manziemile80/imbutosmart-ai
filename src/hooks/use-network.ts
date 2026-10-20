import { useEffect, useState } from "react";

// Network detection for the hybrid recommender. `navigator.onLine` alone is
// unreliable (it only means an interface exists), so the hook also probes the
// app's own origin when the browser claims to be online. Farmers on flaky
// connections get switched to the offline engine automatically, and back
// again when the connection returns — no setting to change.
export type NetworkStatus = "online" | "offline" | "checking";

const PROBE_TIMEOUT_MS = 4000;
// Do not probe more often than this, so tab switches on a dead network do not
// pile up requests.
const PROBE_MIN_GAP_MS = 10_000;

let lastProbeAt = 0;

async function probeReachable(): Promise<boolean> {
  if (typeof fetch === "undefined") return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // A cache-busted same-origin request: if the app itself is unreachable,
    // the farmer is effectively offline even when the device disagrees.
    await fetch(`${window.location.origin}/?netprobe=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useNetworkStatus(): {
  status: NetworkStatus;
  online: boolean;
  recheck: () => void;
} {
  const [status, setStatus] = useState<NetworkStatus>("checking");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (typeof navigator === "undefined") return;
      if (!navigator.onLine) {
        if (!cancelled) setStatus("offline");
        return;
      }
      const now = Date.now();
      if (now - lastProbeAt < PROBE_MIN_GAP_MS) {
        if (!cancelled) setStatus("online");
        return;
      }
      lastProbeAt = now;
      const reachable = await probeReachable();
      if (!cancelled) setStatus(reachable ? "online" : "offline");
    };

    const onOnline = () => {
      setStatus("checking");
      void sync();
    };
    const onOffline = () => setStatus("offline");

    // The first check always probes; later events are throttled above.
    lastProbeAt = 0;
    void sync();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [tick]);

  return {
    status,
    online: status !== "offline",
    recheck: () => setTick((value) => value + 1),
  };
}
