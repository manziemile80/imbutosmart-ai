"""
build_district_inputs.py — What farmers in each district use.

The Seasonal Agricultural Survey asks every segment which fertilisers it used
and which crops they went on. This script turns that into a per-district
profile, so the advice page can tell a farmer what is used around them:

    district        the segment count behind the figures
    usedShare       the share of segments that used any fertiliser
    inorganic       the share of segments using each mineral fertiliser
    organic         the share of segments using each organic fertiliser
    topCrop         the crop most segments applied a mineral fertiliser to

Only aggregates leave the survey: no household, no plot, no amount. Write it
to src/lib/district-inputs.json, where the app reads it.

    python build_district_inputs.py [--out ../src/lib/district-inputs.json]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

SEASON_FILES = {
    "A": "Season A/Rwa_raw_fertilizer_pesticideA2025.csv",
    "B": "Season B/Rwa_raw_fertilizer_pesticideB2025.csv",
    "C": "Season C/Rwa_raw_fertilizer_pesticideC2025.csv",
}

# The agricultural practice file holds the irrigation and erosion questions.
PRACTICE_FILES = {
    "A": "Season A/Rwa_raw_SeasonA2025_Agricultural_practice.csv",
    "B": "Season B/Rwa_raw_SeasonB2025_Agricultural_practice.csv",
    "C": "Season C/Rwa_raw_SeasonC2025_Agricultural_practice.csv",
}

# The four mineral fertiliser slots of the questionnaire.
INORGANIC_COLUMNS = ["s3q101", "s3q102", "s3q103", "s3q104"]
# The organic fertiliser, its own question.
ORGANIC_COLUMN = "s3q2b"
# The crop each mineral slot was applied to.
CROP_COLUMNS = ["s3q151", "s3q152", "s3q153", "s3q154"]

# Spelling variants the survey itself uses; they are the same district.
DISTRICT_ALIASES = {
    "Nyarugenege": "Nyarugenge",
}

# The districts the app knows about, so a spelling that slips through is
# reported rather than quietly ignored.
APP_DISTRICTS = [
    "Bugesera", "Burera", "Gakenke", "Gasabo", "Gatsibo", "Gicumbi", "Gisagara",
    "Huye", "Kamonyi", "Karongi", "Kayonza", "Kicukiro", "Kirehe", "Muhanga",
    "Musanze", "Ngoma", "Ngororero", "Nyabihu", "Nyagatare", "Nyamagabe",
    "Nyamasheke", "Nyanza", "Nyarugenge", "Nyaruguru", "Rubavu", "Ruhango",
    "Rulindo", "Rusizi", "Rutsiro", "Rwamagana",
]


def clean(value: object) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "."}:
        return None
    return text


def main() -> None:
    here = Path(__file__).parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--microdata", required=True, help="Folder with the extracted survey files")
    parser.add_argument("--out", default=str(here.parent / "src" / "lib" / "district-inputs.json"))
    args = parser.parse_args()

    frames = []
    for season, relative in SEASON_FILES.items():
        path = Path(args.microdata) / relative
        if not path.exists():
            raise SystemExit(f"Missing survey file: {path}")
        frame = pd.read_csv(path, sep="\t", dtype=str, low_memory=False, encoding="utf-8")
        frame["season"] = season
        frames.append(frame)
    data = pd.concat(frames, ignore_index=True)

    data["district"] = data["s1q2"].astype(str).str.strip().replace(DISTRICT_ALIASES)
    unknown = sorted(set(data["district"]) - set(APP_DISTRICTS))
    if unknown:
        raise SystemExit(f"Unknown district names in the survey: {unknown}")
    data["used"] = data["s3q1"].astype(str).str.strip().str.lower() == "yes"

    # Irrigation and erosion, from the practice file.
    practice_frames = []
    for season, relative in PRACTICE_FILES.items():
        path = Path(args.microdata) / relative
        if not path.exists():
            raise SystemExit(f"Missing survey file: {path}")
        frame = pd.read_csv(path, sep="\t", dtype=str, low_memory=False, encoding="utf-8")
        frame["season"] = season
        practice_frames.append(frame)
    practice = pd.concat(practice_frames, ignore_index=True)
    practice["district"] = practice["s1q2"].astype(str).str.strip().replace(DISTRICT_ALIASES)
    practice = practice.drop_duplicates(subset=["season", "Segment_ID"])
    practice["irrigated"] = practice["s4q15"].notna() & (practice["s4q15"].astype(str).str.strip() != "")
    practice["eroded"] = practice["s4q1"].astype(str).str.strip().str.contains(
        "Moderate|Severe", regex=True
    )

    # One row per segment and season.
    data = data.drop_duplicates(subset=["season", "Segment_ID"])

    profile: dict[str, dict] = {}
    for district, group in data.groupby("district"):
        segments = len(group)
        used = int(group["used"].sum())
        district_practice = practice[practice["district"] == district]
        practice_segments = len(district_practice)

        inorganic: dict[str, int] = {}
        organic: dict[str, int] = {}
        crops: dict[str, int] = {}
        for column in INORGANIC_COLUMNS:
            if column not in group.columns:
                continue
            for _, row in group.iterrows():
                name = clean(row[column])
                if not name:
                    continue
                inorganic[name] = inorganic.get(name, 0) + 1
        for _, row in group.iterrows():
            name = clean(row.get(ORGANIC_COLUMN))
            if name:
                organic[name] = organic.get(name, 0) + 1
        for column, crop_column in zip(INORGANIC_COLUMNS, CROP_COLUMNS):
            if column not in group.columns or crop_column not in group.columns:
                continue
            for _, row in group.iterrows():
                if not clean(row[column]):
                    continue
                crop = clean(row[crop_column])
                if crop:
                    crops[crop] = crops.get(crop, 0) + 1

        def share(counts: dict[str, int]) -> dict[str, float]:
            return {
                name: round(count / segments, 3)
                for name, count in sorted(counts.items(), key=lambda item: -item[1])
                if count / segments >= 0.01
            }

        top_crop = max(crops.items(), key=lambda item: item[1])[0] if crops else None
        profile[district] = {
            "segments": segments,
            "usedShare": round(used / segments, 3) if segments else 0,
            "inorganic": share(inorganic),
            "organic": share(organic),
            "topCrop": top_crop,
            "irrigatedShare": round(float(district_practice["irrigated"].mean()), 3)
            if practice_segments
            else 0,
            "erodedShare": round(float(district_practice["eroded"].mean()), 3)
            if practice_segments
            else 0,
        }

    Path(args.out).write_text(json.dumps(profile, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {len(profile)} districts to {args.out}")
    for district in list(profile)[:5]:
        entry = profile[district]
        print(f"  {district:12s} used {entry['usedShare']:.0%} | top mineral: "
              f"{list(entry['inorganic'])[:3]} | organic: {list(entry['organic'])[:2]}")


if __name__ == "__main__":
    main()
