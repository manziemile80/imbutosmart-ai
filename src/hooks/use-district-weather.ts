import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getDistrictWeather } from "@/lib/weather.functions";
import type { DistrictWeather } from "@/lib/weather";

// The published weather of the selected district. A source that cannot be
// reached leaves the answer empty rather than showing an error the farmer
// cannot act on.
export function useDistrictWeather(district: string) {
  const load = useServerFn(getDistrictWeather);
  const [weather, setWeather] = useState<DistrictWeather | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load({ data: { district } })
      .then((result) => {
        if (active) setWeather(result);
      })
      .catch((error) => {
        console.error("[weather] call failed", error);
        if (active) setWeather(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [district, load]);

  return { weather, loading };
}
