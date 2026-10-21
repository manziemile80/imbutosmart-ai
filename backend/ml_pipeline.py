"""
ml_pipeline.py — Train ImbutoSmart AI models on the real NISR data.

Run:  python ml_pipeline.py
Outputs (in backend/models/):
    classifier.joblib    RandomForestClassifier -> planting_success_probability
    regressor.joblib     RandomForestRegressor  -> yield_tons_per_ha
    preprocessor.joblib  fitted OneHotEncoder + StandardScaler
    metadata.joblib      known districts/crops/seasons + evaluation metrics

The rows carry the survey's sampling weight, so a segment that stands for many
households counts more than one household does.
"""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

# Intel acceleration is optional — fall back silently on ARM / unsupported CPUs.
try:
    from sklearnex import patch_sklearn
    patch_sklearn()
except Exception:  # pragma: no cover
    pass

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score, roc_auc_score, accuracy_score
from sklearn.model_selection import cross_val_score, train_test_split, KFold, StratifiedKFold

from data_processor import CATEGORICAL, NUMERIC, clean, fit_preprocessor, load_raw

MODEL_DIR = Path(__file__).parent / "models"
SEED = 42


def train() -> dict:
    df = clean(load_raw())
    print(f"Loaded {len(df)} clean rows "
          f"({int((df['success'] == 0).sum())} of them produced nothing)")

    X_df = df[CATEGORICAL + NUMERIC]
    y_cls, y_reg = df["success"], df["yield_tons_per_ha"]
    weights = df["plot_weight"].to_numpy(dtype=float)

    # Split BEFORE fitting the scaler/encoder to avoid leakage into the test set.
    stratify = y_cls if y_cls.nunique() > 1 and y_cls.value_counts().min() >= 2 else None
    Xtr_df, Xte_df, yc_tr, yc_te, yr_tr, yr_te = train_test_split(
        X_df, y_cls, y_reg, test_size=0.2, random_state=SEED, stratify=stratify)

    prep = fit_preprocessor(Xtr_df)
    Xtr, Xte = prep.transform(Xtr_df), prep.transform(Xte_df)

    # The sampling weights of the training split.
    weight_by_index = dict(zip(df.index.to_numpy(), weights))
    w_tr = np.array([weight_by_index[i] for i in Xtr_df.index.to_numpy()], dtype=float)

    # The regressor learns from the crops that were harvested; a crop that
    # produced nothing has no yield to learn from.
    harvested = yr_tr.notna().to_numpy()
    Xtr_y, yr_y, w_y = Xtr[harvested], yr_tr[harvested], w_tr[harvested]
    harvested_test = yr_te.notna().to_numpy()
    Xte_y, yr_y_test = Xte[harvested_test], yr_te[harvested_test]
    test_crop = Xte_df["crop"].to_numpy()[harvested_test]

    clf = RandomForestClassifier(n_estimators=300, max_depth=None, min_samples_leaf=2,
                                 class_weight="balanced", random_state=SEED, n_jobs=-1)
    reg = RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=SEED, n_jobs=-1)

    # 5-fold cross-validation on the training split.
    cv_cls = StratifiedKFold(5, shuffle=True, random_state=SEED) if stratify is not None else 5
    cv_auc = cross_val_score(clf, Xtr, yc_tr, cv=cv_cls, params={"sample_weight": w_tr},
                             scoring="roc_auc" if yc_tr.nunique() > 1 else "accuracy")
    cv_r2 = cross_val_score(reg, Xtr_y, yr_y, cv=KFold(5, shuffle=True, random_state=SEED),
                            params={"sample_weight": w_y}, scoring="r2")

    clf.fit(Xtr, yc_tr, sample_weight=w_tr)
    reg.fit(Xtr_y, yr_y, sample_weight=w_y)

    predictions = reg.predict(Xte_y)
    # The yield error per crop, so a crop measured in tonnes and one measured in
    # kilograms are not judged by the same yardstick.
    per_crop_mae = (
        pd.DataFrame({"crop": test_crop, "error": np.abs(predictions - yr_y_test)})
        .groupby("crop")["error"].mean().round(2).to_dict()
    )

    metrics = {
        "rows": int(len(df)),
        "districts": int(df["district"].nunique()),
        "crops": int(df["crop"].nunique()),
        "seasons": int(df["season"].nunique()),
        "failures": int((df["success"] == 0).sum()),
        "cv_classifier_mean": float(cv_auc.mean()),
        "cv_regressor_r2_mean": float(cv_r2.mean()),
        "test_accuracy": float(accuracy_score(yc_te, clf.predict(Xte))),
        "test_auc": float(roc_auc_score(yc_te, clf.predict_proba(Xte)[:, 1])) if yc_te.nunique() > 1 else None,
        "test_r2": float(r2_score(yr_y_test, predictions)),
        "test_mae_t_ha": float(mean_absolute_error(yr_y_test, predictions)),
        "test_mae_t_ha_by_crop": per_crop_mae,
    }

    metadata = {
        "districts": sorted(df["district"].unique().tolist()),
        "crops": sorted(df["crop"].unique().tolist()),
        "seasons": sorted(df["season"].unique().tolist()),
        # How many farm observations stand behind each crop in each season, so
        # a crop with a handful of observations cannot quietly lead the
        # recommendation.
        "support": {
            crop: {season: int(n) for season, n in row.items()}
            for crop, row in df.groupby(["crop", "season"]).size().unstack(fill_value=0).to_dict(orient="index").items()
        },
        "metrics": metrics,
    }

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(clf, MODEL_DIR / "classifier.joblib")
    joblib.dump(reg, MODEL_DIR / "regressor.joblib")
    joblib.dump(prep, MODEL_DIR / "preprocessor.joblib")
    joblib.dump(metadata, MODEL_DIR / "metadata.joblib")

    for k, v in metrics.items():
        print(f"  {k:24s} {v}")
    return metrics


if __name__ == "__main__":
    train()
