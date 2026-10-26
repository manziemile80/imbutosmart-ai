# Backend data pipeline

The prediction service and the district figures in the app are built from the
NISR Seasonal Agricultural Survey 2025 microdata. That microdata is
confidential: it is never committed and never uploaded. This folder holds only
the scripts that read it and the public aggregates they produce.

## Dataset layout

Point `--microdata` at a folder with the three season directories exactly as
NISR distributes them:

```
<microdata folder>/
├── Season A/
│   ├── Rwa_raw_SeasonA2025_Production.csv
│   ├── Rwa_raw_fertilizer_pesticideA2025.csv
│   └── Rwa_raw_SeasonA2025_Agricultural_practice.csv
├── Season B/
│   └── ... the same three files for season B
└── Season C/
    └── ... the same three files for season C
```

The `.dta` and `.sav` copies are not read by these scripts; the `.csv` files
carry the same records. Extra survey modules (screening, pesticide detail) are
not needed.

## Build the data the app uses

Run from `backend/` with the microdata folder as the argument:

```bash
# What farmers in each district use: shares, rates, irrigation, erosion.
# Writes ../src/lib/district-inputs.json (committed: aggregates only).
python build_district_inputs.py --microdata "<microdata folder>"

# The training table. Writes nisr_real_data.csv (git-ignored).
python prepare_training_data.py --microdata "<microdata folder>"

# Fit the classifier and the regressor. Writes models/*.joblib (git-ignored).
python ml_pipeline.py
```

`build_district_climate.py` is separate: it fetches the public NASA POWER
(MERRA-2) record for each district and refreshes
`../src/lib/district-climate.json`. It needs the network; the committed file
means neither the app nor training needs it at run time.

On this machine the survey files are copied for local builds into
`dataset/Microdata`, which is git-ignored. The same layout is accepted from the
original NISR download folder, so either path works:

```bash
python build_district_inputs.py --microdata ../dataset/Microdata
python prepare_training_data.py --microdata ../dataset/Microdata
```

## What the scripts produced

The 2025 survey extracts used for this project produce:

- **30 districts, 12 crops, 51,225 training rows** across seasons A, B and C.
- `../src/lib/district-inputs.json` — 30 district profiles. Regenerating it from
  the same extracts leaves the committed file unchanged.
- `nisr_real_data.csv` — the training table, byte-identical when rebuilt from
  the same extracts (SHA-256
  `4EF033517E701B872DE6A82D42C8742B71CD22D87D95B902D912184FAF221264`).
- `models/` — `classifier.joblib`, `regressor.joblib`, `preprocessor.joblib`
  and `metadata.joblib`, supplied to the Render service at deploy time.

## Rules

- Never commit the survey microdata, the training table or the models. The root
  `.gitignore` already excludes `nisr_real_data.csv` and `models/`.
- Only district aggregates leave the survey: no household, plot or farmer
  record is written to a file the app reads.
- A figure the survey does not hold stays unavailable. The app does not fill a
  missing district measurement with a national total or an estimate.
- The app's climate record is NASA POWER / MERRA-2 (2001–2020), not a
  hand-made file. An unrelated Open-Meteo CSV is not part of this pipeline.
