# SowSmart Rwanda 🌱
NISR 2026 Big Data Hackathon

SowSmart turns NISR agricultural survey data into planting advice. A Random Forest classifier estimates
the probability that a crop will succeed under a farmer's district, soil and forecast weather, and a
Random Forest regressor estimates expected yield (t/ha). Crops are ranked by expected value.

**NST2 alignment:** supports the National Strategy for Transformation pillar on agricultural productivity —
raising yields per hectare, climate-resilient crop choice, and data-driven extension services.

## Structure
```
backend/   FastAPI + scikit-learn (data_processor.py, ml_pipeline.py, main.py, Dockerfile)
src/       Web app: Farmer Advisory (/) and Agronomist Dashboard (/dashboard)
```

## Run the backend
```bash
cd backend
pip install -r requirements.txt
cp /path/to/nisr_real_data.csv .
python ml_pipeline.py          # trains + prints metrics, writes models/
uvicorn main:app --reload --port 8000
```

## Run the frontend
```bash
cp .env.example .env           # set VITE_API_URL
npm install && npm run dev
```

## Deploy
- **Backend → Render.com:** Connect this repository in Render and create a Blueprint using the root `render.yaml`. Alternatively create a Docker Web Service with root directory `backend`. This workspace has no Render deployment connection; the Blueprint must be launched from your Render account. Render may charge for your chosen service plan.
- Before deployment, supply `backend/nisr_real_data.csv` with real district/crop/soil/weather/yield observations, or train privately and supply the four `backend/models/*.joblib` artifacts. Never commit confidential survey microdata to a public repository. Without these inputs `/health` can respond, but `/predict`, `/meta`, and `/stats` return 503: no trained model.
- After deployment, verify `/meta` and a real `/predict` request (not just `/health`), then set the frontend `VITE_API_URL` to the HTTPS Render service address. `/stats` supplies held-out test accuracy and yield MAE in t/ha; historical comparison charts are in-sample, not test results.
- **Frontend:** set `VITE_API_URL` to the Render URL and publish (Lovable Publish, or any static/edge host such as Vercel).

## District land-use map
The dashboard imports district aggregate CSVs in the current browser session; they are not uploaded to the prediction service and are not training data. Required columns: `district,crops_ha,pasture_ha,fallow_ha`. Values must be nonnegative hectares; missing districts remain unavailable. Shares use only the sum of those three categories, not all district land. Crop area must be a non-overlapping physical area, not the sum of crop areas that double-count intercropping. Only import aggregate, non-sensitive figures. The supplied national PDF is not sufficient to populate district shares.

## AI Disclosure
AI assistants (Codex) were used to architect the ML pipeline, generate UI components, and debug code. The core data strategy, NISR data preprocessing logic, and system design were implemented by the team.
