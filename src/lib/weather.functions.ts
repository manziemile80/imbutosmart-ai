import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DISTRICTS } from "./api";
import type { DistrictWeather } from "./weather";

// Server function for the district weather. The browser asks for a district
// and receives the numbers and the name of their source; the endpoints and
// their parameters stay on the server.

export const weatherInputSchema = z.object({
  district: z.string().refine((value) => DISTRICTS.includes(value), "Unknown district."),
});

export const getDistrictWeather = createServerFn({ method: "GET" })
  .validator((input: unknown) => weatherInputSchema.parse(input))
  .handler(async ({ data }): Promise<DistrictWeather> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { getDistrictWeather: load } = await import("./weather.server");
    return load(data.district);
  });
