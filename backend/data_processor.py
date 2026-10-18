"""
data_processor.py — Ingest and clean the real NISR agricultural CSV.

Expected file: backend/nisr_real_data.csv

Column names in NISR exports vary between survey rounds (Seasonal Agricultural
Survey, EICV, etc.). COLUMN_ALIASES maps the many spellings we have seen onto a
single canonical schema, so the rest of the pipeline never depends on raw names.

Canonical schema:
    district           (categorical)  e.g. "Musanze"
    crop               (categorical)  e.g. "Maize"
    soil_type          (categorical)  e.g. "Volcanic"
    rain_mm            (numeric)      seasonal rainfall in mm
    temp_c             (numeric)      mean seasonal temperature in °C
    yield_tons_per_ha  (numeric)      target for the regressor
    success            (0/1)          target for the classifier
    year / season      (optional)     used only for /stats aggregation
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA_PATH = Path(__file__).parent / "nisr_real_data.csv"

CATEGORICAL = ["district", "crop", "soil_type"]
NUMERIC = ["rain_mm", "temp_c"]

# Lower-cased raw column name -> canonical name. Extend this after inspecting your CSV.
COLUMN_ALIASES: dict[str, str] = {
    "district": "district", "district_name": "district", "akarere": "district",
    "crop": "crop", "crop_name": "crop", "crop_type": "crop",
    "soil": "soil_type", "soil_type": "soil_type", "soiltype": "soil_type",
    "rain": "rain_mm", "rainfall": "rain_mm", "rainfall_mm": "rain_mm", "rain_mm": "rain_mm",
    "forecast_rain_mm": "rain_mm", "precipitation_mm": "rain_mm",
    "temp": "temp_c", "temperature": "temp_c", "temp_c": "temp_c",
    "avg_temp_c": "temp_c", "forecast_temp_c": "temp_c", "mean_temp": "temp_c",
    "yield": "yield_tons_per_ha", "yield_t_ha": "yield_tons_per_ha",
    "yield_tons_per_ha": "yield_tons_per_ha", "yield_kg_ha": "yield_kg_per_ha",
    "success": "success", "planting_success": "success", "harvest_success": "success",
    "year": "year", "season": "season",
}

# If the CSV has no explicit success label, a harvest counts as "successful"
# when its yield reaches this fraction of the median yield for that crop.
SUCCESS_YIELD_RATIO = 0.8


@dataclass
class Preprocessor:
    """Fitted encoder + scaler, persisted with joblib next to the models."""
    encoder: OneHotEncoder
    scaler: StandardScaler

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        cat = self.encoder.transform(df[CATEGORICAL].astype(str))
        num = self.scaler.transform(df[NUMERIC].astype(float))
        return np.hstack([num, cat])


def load_raw(path: Path = DATA_PATH) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Place the NISR CSV at {path}")
    df = pd.read_csv(path)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df = df.rename(columns={c: COLUMN_ALIASES[c] for c in df.columns if c in COLUMN_ALIASES})
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Convert kg/ha to t/ha when only kg is provided.
    if "yield_tons_per_ha" not in df and "yield_kg_per_ha" in df:
        df["yield_tons_per_ha"] = pd.to_numeric(df["yield_kg_per_ha"], errors="coerce") / 1000

    required = CATEGORICAL + NUMERIC + ["yield_tons_per_ha"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns {missing}. Found: {list(df.columns)}. "
                         "Add aliases in COLUMN_ALIASES.")

    # Normalise categorical text: trim + title-case, empty -> NaN.
    for c in CATEGORICAL:
        df[c] = df[c].astype(str).str.strip().str.title().replace({"": np.nan, "Nan": np.nan})

    for c in NUMERIC + ["yield_tons_per_ha"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Rows without a target or crop are unusable.
    df = df.dropna(subset=["yield_tons_per_ha", "crop"])
    df = df[df["yield_tons_per_ha"] >= 0]

    # Impute numerics with the district median (climate is regional), then global median.
    for c in NUMERIC:
        df[c] = df.groupby("district")[c].transform(lambda s: s.fillna(s.median()))
        df[c] = df[c].fillna(df[c].median())

    # Impute categoricals with the mode / "Unknown".
    df["district"] = df["district"].fillna("Unknown")
    df["soil_type"] = df.groupby("district")["soil_type"].transform(
        lambda s: s.fillna(s.mode().iloc[0] if not s.mode().empty else "Unknown"))

    # Clip extreme outliers (data-entry errors) at the 1st/99th percentile per crop.
    lo = df.groupby("crop")["yield_tons_per_ha"].transform(lambda s: s.quantile(0.01))
    hi = df.groupby("crop")["yield_tons_per_ha"].transform(lambda s: s.quantile(0.99))
    df["yield_tons_per_ha"] = df["yield_tons_per_ha"].clip(lo, hi)

    # Derive the success label if missing.
    if "success" not in df.columns:
        crop_median = df.groupby("crop")["yield_tons_per_ha"].transform("median")
        df["success"] = (df["yield_tons_per_ha"] >= SUCCESS_YIELD_RATIO * crop_median).astype(int)
    else:
        df["success"] = pd.to_numeric(df["success"], errors="coerce").fillna(0).clip(0, 1).astype(int)

    return df.reset_index(drop=True)


def fit_preprocessor(df: pd.DataFrame) -> Preprocessor:
    enc = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    enc.fit(df[CATEGORICAL].astype(str))
    sc = StandardScaler().fit(df[NUMERIC].astype(float))
    return Preprocessor(enc, sc)


if __name__ == "__main__":
    data = clean(load_raw())
    print(data.describe(include="all").T)
    print(f"\n{len(data)} clean rows, {data['crop'].nunique()} crops, {data['district'].nunique()} districts")
