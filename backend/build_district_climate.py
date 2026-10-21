"""
build_district_climate.py — District climate for the training data.

Fetches the published 20-year climate record of every district (NASA POWER,
MERRA-2) at the point at the centre of its boundary, plus the weather of the
survey year itself, and writes both to backend/district_climate.json:

    months            monthly rainfall and temperature normals
    annualRainMm      the normal annual rainfall
    seasons2025       the rainfall and temperature of each agricultural season
                      of the 2025 survey year, so a training row carries the
                      weather the farmers actually had

The file holds public climate records, so it is committed and the training run
never needs the network. Re-run it to refresh the record:

    python build_district_climate.py [--centroids ../src/lib/district-centroids.json] [--out district_climate.json]

Rainfall in the source is a daily mean in millimetres, so it is turned into a
monthly total with the average length of the month.
"""
from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path

POWER_CLIMATOLOGY_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
START_YEAR = 2001
END_YEAR = 2020
SURVEY_YEAR = 2025

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

# The months each agricultural season covers.
SEASON_MONTHS = {
    "A": ["09", "10", "11", "12", "01", "02"],
    "B": ["03", "04", "05", "06"],
    "C": ["07", "08", "09"],
}

# Average number of days in each month, so a daily mean becomes a monthly total.
AVERAGE_DAYS = {
    "JAN": 31, "FEB": 28.25, "MAR": 31, "APR": 30, "MAY": 31, "JUN": 30,
    "JUL": 31, "AUG": 31, "SEP": 30, "OCT": 31, "NOV": 30, "DEC": 31,
}


def _get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_district(lat: float, lon: float) -> dict:
    url = (
        f"{POWER_CLIMATOLOGY_URL}?parameters=PRECTOTCORR,T2M&community=AG"
        f"&longitude={lon}&latitude={lat}&start={START_YEAR}&end={END_YEAR}&format=JSON"
    )
    parameter = _get(url)["properties"]["parameter"]
    rain = parameter["PRECTOTCORR"]
    temperature = parameter["T2M"]
    months = {}
    for month in MONTHS:
        months[month] = {
            "rainMm": round(float(rain[month]) * AVERAGE_DAYS[month], 1),
            "tempC": round(float(temperature[month]), 2),
        }

    daily = _get(
        f"{POWER_DAILY_URL}?parameters=PRECTOTCORR,T2M&community=AG"
        f"&longitude={lon}&latitude={lat}&start={SURVEY_YEAR}0101&end={SURVEY_YEAR}1231&format=JSON"
    )["properties"]["parameter"]
    daily_rain = daily["PRECTOTCORR"]
    daily_temp = daily["T2M"]
    seasons = {}
    for season, season_months in SEASON_MONTHS.items():
        days = [day for day in daily_rain if day.startswith(str(SURVEY_YEAR)) and day[4:6] in season_months]
        rain_total = sum(daily_rain[day] for day in days if daily_rain.get(day) is not None)
        temps = [daily_temp[day] for day in days if daily_temp.get(day) is not None]
        seasons[season] = {
            "rainMm": round(rain_total, 1),
            "tempC": round(sum(temps) / len(temps), 2) if temps else None,
        }

    return {
        "months": months,
        "annualRainMm": round(sum(months[m]["rainMm"] for m in MONTHS), 1),
        "seasons2025": seasons,
        "period": f"{START_YEAR}-{END_YEAR}",
        "source": "NASA POWER (MERRA-2)",
        "sourceUrl": "https://power.larc.nasa.gov/",
    }


def main() -> None:
    here = Path(__file__).parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--centroids", default=str(here.parent / "src" / "lib" / "district-centroids.json"))
    parser.add_argument("--out", default=str(here / "district_climate.json"))
    args = parser.parse_args()

    centroids = json.loads(Path(args.centroids).read_text(encoding="utf-8"))
    climate = {}
    for district in sorted(centroids):
        point = centroids[district]
        climate[district] = fetch_district(point["lat"], point["lon"])
        print(f"{district:14s} annual {climate[district]['annualRainMm']:7.0f} mm")

    Path(args.out).write_text(json.dumps(climate, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"\nWrote {len(climate)} districts to {args.out}")


if __name__ == "__main__":
    main()
