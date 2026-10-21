"""
main.py — ImbutoSmart AI API.

    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data_processor import CATEGORICAL, NUMERIC, clean, load_raw

MODEL_DIR = Path(__file__).parent / "models"

app = FastAPI(title="ImbutoSmart AI API", version="1.1.0")

# Comma-separated list, e.g. "https://imbutosmart.vercel.app,http://localhost:3000"
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

_models: dict = {}


def models() -> dict:
    """Lazy-load joblib artifacts once per process."""
    if not _models:
        try:
            for name in ("classifier", "regressor", "preprocessor", "metadata"):
                _models[name] = joblib.load(MODEL_DIR / f"{name}.joblib")
        except FileNotFoundError:
            raise HTTPException(503, "Models not trained. Run `python ml_pipeline.py` first.")
    return _models


class PredictRequest(BaseModel):
    district: str
    season: str = Field(pattern="^[ABC]$")
    forecast_rain_mm: float = Field(ge=0, le=5000)
    forecast_temp_c: float = Field(ge=-5, le=45)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/meta")
def meta():
    """Districts, crops and seasons seen in training — used to populate the form."""
    m = models()["metadata"]
    return {k: m[k] for k in ("districts", "crops", "seasons", "metrics")}


@app.post("/predict")
def predict(req: PredictRequest):
    m = models()
    crops = m["metadata"]["crops"]

    # Score every known crop under the farmer's conditions and rank them.
    rows = pd.DataFrame({
        "district": req.district.strip().title(),
        "crop": crops,
        "season": req.season.strip().upper(),
        "rain_mm": req.forecast_rain_mm,
        "temp_c": req.forecast_temp_c,
    })[CATEGORICAL + NUMERIC]
    X = m["preprocessor"].transform(rows)

    proba = m["classifier"].predict_proba(X)
    pos_idx = list(m["classifier"].classes_).index(1) if 1 in m["classifier"].classes_ else 0
    success = proba[:, pos_idx]
    yields = m["regressor"].predict(X)

    # How many farm observations stand behind each crop in this season.
    support = m["metadata"].get("support", {})

    # Expected value = probability of success x predicted yield.
    ranked = sorted(
        [{"crop": c, "success_probability": float(p), "expected_yield_t_ha": float(y),
          "score": float(p * y),
          "observations": int(support.get(c, {}).get(req.season.strip().upper(), 0))}
         for c, p, y in zip(crops, success, yields)],
        key=lambda r: r["score"], reverse=True)

    best = ranked[0]
    return {
        "recommended_crop": best["crop"],
        "confidence": best["success_probability"],
        "expected_yield_t_ha": best["expected_yield_t_ha"],
        "observations": best["observations"],
        "alternatives": ranked[1:4],
    }


@app.get("/stats")
def stats():
    """Historical yield per crop (and per season if present) vs. model prediction."""
    m = models()
    df = clean(load_raw())
    df["predicted"] = m["regressor"].predict(m["preprocessor"].transform(df[CATEGORICAL + NUMERIC]))

    by_crop = (df.groupby("crop")
               .agg(actual=("yield_tons_per_ha", "mean"), predicted=("predicted", "mean"), n=("crop", "size"))
               .round(2).reset_index().to_dict("records"))
    time_col = "season" if "season" in df else ("year" if "year" in df else None)
    by_time = []
    if time_col:
        by_time = (df.groupby(time_col)
                   .agg(actual=("yield_tons_per_ha", "mean"), predicted=("predicted", "mean"))
                   .round(2).reset_index().rename(columns={time_col: "period"})
                   .astype({"period": str}).to_dict("records"))
    return {"by_crop": by_crop, "by_period": by_time, "metrics": m["metadata"]["metrics"]}
