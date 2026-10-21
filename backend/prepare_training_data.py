"""
prepare_training_data.py — Turn the NISR Seasonal Agricultural Survey
microdata into the training table the models are fitted on.

The survey records every crop a household planted: the district, the crop, the
area, what was harvested and the sampling weight. It does not record soil type
or the weather of the plot, so the training rows carry:

    district            from the survey
    crop                from the survey, mapped onto the crops the app offers
    season / year       the survey round the row belongs to
    rain_mm / temp_c    the weather of that district and season in the survey
                        year, from district_climate.json (NASA POWER, MERRA-2)
    yield_tons_per_ha   harvested quantity per hectare, from the survey
    success             1 when the crop was harvested, 0 when it was planted
                        and produced nothing
    plot_weight         the number of households the segment stands for

A crop that is planted in one round and harvested in the next (cassava, for
example) is not a failure, so a crop-season pair where fewer than half of the
observations were harvested contributes only the rows that were harvested.

The microdata itself never enters the repository: point this script at the
extracted survey files and it writes the training table.

    python prepare_training_data.py --microdata "C:/Users/Student/Downloads/Microdata"
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

# The crops the app offers, and the survey names that belong to each of them.
CROP_NAMES: dict[str, tuple[str, ...]] = {
    "Maize": ("Maize",),
    "Beans": ("Bush bean", "Climbing bean", "French beans", "Small red bean"),
    "Irish Potato": ("Irish potato",),
    "Sweet Potato": ("Sweet potato",),
    "Cassava": ("Cassava",),
    "Sorghum": ("Sorghum",),
    "Wheat": ("Wheat",),
    "Rice": ("Paddy rice",),
    "Banana": ("Cooking banana", "Dessert banana"),
    "Tomato": ("Tomato",),
    "Onion": ("Onion",),
    "Cabbage": ("Cabbage",),
}
SURVEY_TO_CROP = {name: crop for crop, names in CROP_NAMES.items() for name in names}

SEASON_FILES = {
    "A": "Season A/Rwa_raw_SeasonA2025_Production.csv",
    "B": "Season B/Rwa_raw_SeasonB2025_Production.csv",
    "C": "Season C/Rwa_raw_SeasonC2025_Production.csv",
}

YEAR = 2025

# A crop-season pair is normally harvested in that round when at least this
# share of the observations produced a harvest.
HARVESTED_IN_ROUND = 0.5


def read_season(path: Path, climate: dict) -> pd.DataFrame:
    frame = pd.read_csv(path, sep="\t", dtype=str, low_memory=False, encoding="utf-8")
    weight_column = "plot_weight" if "plot_weight" in frame.columns else "Plot_weight"

    rows = pd.DataFrame({
        "district": frame["s1q2"].str.strip(),
        "survey_crop": frame["s2q4"].str.strip(),
        "crop_area_ha": pd.to_numeric(frame["Crop_Area_ha"], errors="coerce"),
        "harvest_kg": pd.to_numeric(frame["s2q21"], errors="coerce"),
        "yield_kg_per_ha": pd.to_numeric(frame["Yield"], errors="coerce"),
        "plot_weight": pd.to_numeric(frame[weight_column], errors="coerce"),
    })
    rows = rows[rows["district"].isin(climate)].copy()
    rows["crop"] = rows["survey_crop"].map(SURVEY_TO_CROP)
    rows = rows[rows["crop"].notna()].copy()

    # A crop that was not planted has no area: it is not an observation.
    rows = rows[rows["crop_area_ha"] > 0].copy()
    rows["harvested"] = rows["harvest_kg"].notna() & (rows["harvest_kg"] > 0)
    return rows


def label_success(rows: pd.DataFrame) -> pd.DataFrame:
    """Mark the crops that were planted and produced nothing as unsuccessful.

    A crop that is normally harvested in the round counts a missing harvest as
    a failure. A crop that is normally harvested in a later round (cassava in
    season A) contributes only the observations that were harvested.
    """
    rows = rows.copy()
    rows["success"] = rows["harvested"].astype(int)
    rates = rows.groupby(["crop", "season"])["harvested"].mean()
    normally_harvested = {
        pair for pair, rate in rates.items() if rate >= HARVESTED_IN_ROUND
    }
    rows["harvested_in_round"] = [
        (crop, season) in normally_harvested for crop, season in zip(rows["crop"], rows["season"])
    ]
    # Rows of a crop that is not harvested in this round carry no outcome.
    rows = rows[rows["harvested"] | rows["harvested_in_round"]].copy()
    return rows


def main() -> None:
    here = Path(__file__).parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--microdata", required=True, help="Folder with the extracted survey files")
    parser.add_argument("--climate", default=str(here.parent / "src" / "lib" / "district-climate.json"))
    parser.add_argument("--out", default=str(here / "nisr_real_data.csv"))
    args = parser.parse_args()

    climate = json.loads(Path(args.climate).read_text(encoding="utf-8"))
    microdata = Path(args.microdata)

    frames = []
    for season, relative in SEASON_FILES.items():
        path = microdata / relative
        if not path.exists():
            raise SystemExit(f"Missing survey file: {path}")
        rows = read_season(path, climate)
        rows["season"] = season
        rows["year"] = YEAR
        frames.append(rows)
        print(f"season {season}: {len(rows)} crop observations")

    data = label_success(pd.concat(frames, ignore_index=True))

    # The weather the farmers of that district had in that season.
    data["rain_mm"] = [
        climate[district]["seasons2025"][season]["rainMm"]
        for district, season in zip(data["district"], data["season"])
    ]
    data["temp_c"] = [
        climate[district]["seasons2025"][season]["tempC"]
        for district, season in zip(data["district"], data["season"])
    ]

    data["yield_tons_per_ha"] = data["yield_kg_per_ha"] / 1000.0
    data["plot_weight"] = data["plot_weight"].fillna(1.0).clip(lower=0.1)

    data = data[[
        "district", "crop", "season", "year", "rain_mm", "temp_c",
        "yield_tons_per_ha", "success", "plot_weight",
    ]]
    data = data.sort_values(["district", "season", "crop"]).reset_index(drop=True)
    data.to_csv(args.out, index=False)

    print(f"\n{len(data)} rows -> {args.out}")
    print(f"crops: {sorted(data['crop'].unique())}")
    print(f"districts: {data['district'].nunique()}")
    print(data.groupby(["crop", "season"]).agg(
        rows=("yield_tons_per_ha", "size"),
        mean_yield=("yield_tons_per_ha", "mean"),
        success=("success", "mean"),
    ).round(3).to_string())


if __name__ == "__main__":
    main()
