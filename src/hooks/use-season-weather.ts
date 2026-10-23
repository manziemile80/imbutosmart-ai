import { useEffect, useState } from "react";

import { seasonFigures, type AgriculturalSeason, type DistrictClimate } from "@/lib/weather";

// The rain and temperature figures the crop model needs. They are filled from
// the selected district's published climate record, for the season the farmer
// chose, and stay under that record's control until the farmer edits them. An
// edited figure is never overwritten; handing the field back to the record
// fills both figures again.
export function useSeasonWeather(
  climate: DistrictClimate | null,
  season: AgriculturalSeason | null,
  month: number,
) {
  const [rain, setRainState] = useState("");
  const [temp, setTempState] = useState("");
  const [rainEdited, setRainEdited] = useState(false);
  const [tempEdited, setTempEdited] = useState(false);

  useEffect(() => {
    const figures = climate ? seasonFigures(climate, season, month) : null;
    if (!rainEdited) {
      setRainState(figures?.rainMm == null ? "" : String(Math.round(figures.rainMm)));
    }
    if (!tempEdited) {
      setTempState(figures?.tempC == null ? "" : figures.tempC.toFixed(1));
    }
  }, [climate, season, month, rainEdited, tempEdited]);

  return {
    rain,
    temp,
    rainEdited,
    tempEdited,
    setRain: (value: string) => {
      setRainState(value);
      setRainEdited(true);
    },
    setTemp: (value: string) => {
      setTempState(value);
      setTempEdited(true);
    },
    // Hand both figures back to the district record.
    useDistrictFigures: () => {
      setRainEdited(false);
      setTempEdited(false);
    },
  };
}
