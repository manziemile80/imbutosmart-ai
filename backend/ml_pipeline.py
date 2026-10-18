"""
ml_pipeline.py — Train ImbutoSmart AI models on the real NISR data.

Run:  python ml_pipeline.py
Outputs (in backend/models/):
    classifier.joblib    RandomForestClassifier -> planting_success_probability
    regressor.joblib     RandomForestRegressor  -> yield_tons_per_ha
    preprocessor.joblib  fitted OneHotEncoder + StandardScaler
    metadata.joblib      known districts/soils/crops + evaluation metrics
"""
from __future__ import annotations

from pathlib import Path

import joblib

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
    print(f"Loaded {len(df)} clean rows")

    X_df = df[CATEGORICAL + NUMERIC]
    y_cls, y_reg = df["success"], df["yield_tons_per_ha"]

    # Split BEFORE fitting the scaler/encoder to avoid leakage into the test set.
    stratify = y_cls if y_cls.nunique() > 1 and y_cls.value_counts().min() >= 2 else None
    Xtr_df, Xte_df, yc_tr, yc_te, yr_tr, yr_te = train_test_split(
        X_df, y_cls, y_reg, test_size=0.2, random_state=SEED, stratify=stratify)

    prep = fit_preprocessor(Xtr_df)
    Xtr, Xte = prep.transform(Xtr_df), prep.transform(Xte_df)

    clf = RandomForestClassifier(n_estimators=300, max_depth=None, min_samples_leaf=2,
                                 class_weight="balanced", random_state=SEED, n_jobs=-1)
    reg = RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=SEED, n_jobs=-1)

    # 5-fold cross-validation on the training split.
    cv_cls = StratifiedKFold(5, shuffle=True, random_state=SEED) if stratify is not None else 5
    cv_auc = cross_val_score(clf, Xtr, yc_tr, cv=cv_cls,
                             scoring="roc_auc" if yc_tr.nunique() > 1 else "accuracy")
    cv_r2 = cross_val_score(reg, Xtr, yr_tr, cv=KFold(5, shuffle=True, random_state=SEED), scoring="r2")

    clf.fit(Xtr, yc_tr)
    reg.fit(Xtr, yr_tr)

    metrics = {
        "rows": int(len(df)),
        "cv_classifier_mean": float(cv_auc.mean()),
        "cv_regressor_r2_mean": float(cv_r2.mean()),
        "test_accuracy": float(accuracy_score(yc_te, clf.predict(Xte))),
        "test_auc": float(roc_auc_score(yc_te, clf.predict_proba(Xte)[:, 1])) if yc_te.nunique() > 1 else None,
        "test_r2": float(r2_score(yr_te, reg.predict(Xte))),
        "test_mae_t_ha": float(mean_absolute_error(yr_te, reg.predict(Xte))),
    }

    metadata = {
        "districts": sorted(df["district"].unique().tolist()),
        "soil_types": sorted(df["soil_type"].unique().tolist()),
        "crops": sorted(df["crop"].unique().tolist()),
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
