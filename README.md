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
- **Backend → Render.com:** New Web Service → Docker → root dir `backend`. Set env `ALLOWED_ORIGINS` to your frontend URL. Commit `nisr_real_data.csv` (or the `models/` folder) so the image can train/serve.
- **Frontend:** set `VITE_API_URL` to the Render URL and publish (Lovable Publish, or any static/edge host such as Vercel).

## AI Disclosure
AI assistants (Codex) were used to architect the ML pipeline, generate UI components, and debug code. The core data strategy, NISR data preprocessing logic, and system design were implemented by the team.
