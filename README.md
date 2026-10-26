# ImbutoSmart AI

**NISR 2026 Big Data Hackathon**

**Updated Project README / Technical Overview**

Repository: [github.com/manziemile80/imbutosmart-ai](https://github.com/manziemile80/imbutosmart-ai)

## 1. Project Overview

ImbutoSmart AI turns NISR agricultural survey data into practical planting advice. A Random Forest classifier estimates the probability that a crop will succeed under a farmer's district, soil and forecast-weather conditions, while a Random Forest regressor estimates expected yield in tonnes per hectare (t/ha). Crops are ranked by expected value. The platform extends these predictions with district climate, weather, agronomic suitability, soil/input guidance, seasonal advice, insurance awareness, and AI assistance.

**NST2 alignment:** supports agricultural productivity, raising yields per hectare, climate-resilient crop choice, and data-driven extension services.

## 2. Problem Statement

Rwandan farmers need clear, localized information to decide what to plant and how to manage production under different soil, seasonal and weather conditions. Agricultural and weather information can be difficult to combine into one practical decision. Farmers therefore need a system that translates available agricultural statistics and weather information into understandable, location-specific advice.

ImbutoSmart AI addresses this gap by combining NISR agricultural survey information with district climate and forecast weather, machine-learning models, and a separate agronomic suitability engine. The result is a farmer-facing recommendation rather than a raw dataset or model output.

## 3. Main Purpose

The purpose of ImbutoSmart AI is to transform agricultural and meteorological data into simple, localized and actionable advice that helps farmers choose suitable crops, understand rainfall and seasonal conditions, estimate potential yield, improve soil and input management, and make informed agricultural-risk and insurance decisions.

## 4. Core Farmer Questions

- Which crops are suitable for my district and soil?
- What is the estimated probability that each crop will succeed?
- What yield can I expect in tonnes per hectare?
- What are the usual rainfall and temperature conditions in my district?
- What weather is expected in the coming days?
- What agricultural inputs are commonly used in my district and at what observed rates?
- When should I act based on seasonal and forecast conditions?
- What insurance is worth asking about when production risk is high?
- Can I receive advice in simple language, including Kinyarwanda and French text support?

## 5. Data and Evidence

### 5.1 NISR Seasonal Agricultural Survey 2025

The training data come from NISR Seasonal Agricultural Survey 2025 microdata covering Seasons A, B and C. The prepared training table contains **51,225 crop observations across 30 districts, 12 crops and 3 seasons**. Crop names are mapped to the crop categories offered by the application. The survey records district, crop, area, harvest information and sampling weight.

The microdata and trained models remain outside the repository and are built locally.

### 5.2 District Climate and Weather

Because the survey does not record plot-level soil type or plot-level weather, ML training rows use district climate for the relevant season. The project builds district climate from the published **2001–2020 record using NASA POWER and MERRA-2** at district-centre locations, together with weather from the 2025 survey year.

The farmer interface separates usual district climate from the coming-days forecast. Climate comes from NASA POWER and the forecast comes from Open-Meteo; both are fetched server-side and their sources are shown.

## 6. Machine-Learning Models

### 6.1 Crop Success Classifier

A Random Forest classifier estimates the probability that a crop will succeed under district, season and weather conditions represented by the model.

### 6.2 Expected Yield Regressor

A Random Forest regressor estimates expected yield in tonnes per hectare. Crops can then be ranked using estimated success probability and expected yield.

### 6.3 Model Evaluation

On a held-out fifth of the survey data, the current project reports **classifier AUC 0.94** and **yield-regressor R² 0.81**, with per-crop yield errors including **0.84 t/ha for maize** and **0.29 t/ha for beans**. The project also notes that 2025 was a below-average rainfall year, so learned yields reflect a relatively dry survey year.

## 7. Soil, Manure and Agronomic Advice

Farmer-selected soil is not treated as a measured variable in the ML training model. Instead, soil is used by a separate knowledge-based agronomic suitability engine. This distinction prevents the system from implying that the NISR survey directly measured plot-level soil.

The Advice portal provides district-level information about **DAP, NPK, urea, manure, compost** and other inputs, including observed application rates in kg/ha, together with irrigation and soil-erosion indicators. These are aggregate district profiles rather than household-level data.

## 8. Seasonal Rainfall and When to Act

The system combines the district's usual seasonal rainfall and temperature with the coming-days forecast to help the farmer decide when to act.

Rainfall information should be presented as statistical or forecast guidance, not as a guarantee that a particular amount of rain will occur.

## 9. Agricultural Insurance Advice

Insurance-related guidance is included in the farmer summary. The system helps the farmer identify insurance worth asking about in relation to agricultural risk. It is decision support and awareness, not an insurance contract or guarantee of coverage.

## 10. AI Assistance

The farmer Q&A assistant and season explanations use an OpenAI-compatible chat-completions endpoint. The farmer assistant answers agronomic questions in the farmer's language, while the agronomist assistant uses figures displayed by the dashboard, the model report and district climate. The model is instructed to use the supplied evidence and say when a figure is missing.

The system can use a hosted provider such as **Groq** or a local **Ollama** model. The documented local configuration uses `qwen2.5:3b` for chat and a separate local speech backend.

## 11. Voice and Language Support

The Guidance portal provides **Ask a question**, **Speak your question**, **This season** and **My plan**. The page is available in **English, Kinyarwanda and French**.

The current local speech configuration declares English as the supported spoken language. Kinyarwanda and French answers remain available as written responses unless a speech backend that reliably supports those languages is configured.

## 12. Application Structure

The project uses a FastAPI + scikit-learn backend and a React web application. The backend contains data preparation, the ML pipeline and API code; the frontend contains Farmer Advisory and Agronomist Dashboard interfaces.

```
backend/            FastAPI + scikit-learn
src/                React web application
src/components/ui/  reusable Panel, Callout, StatusPill and Stat primitives
src/styles.css      shared design tokens and light/dark theme values
```

### 12.1 Agronomist Dashboard

The `/dashboard` page is the advisory workspace for agricultural officers. It reads the same district, soil and season that the farmer sets on the Farmer page, and it has thirteen modules: overview, manure and fertiliser, agronomist contacts, farmer profiles, crop-advice review, soil and nutrients, weather risk, pests and disease, insurance, farmer messages, the knowledge centre, reports and follow-up, and offline data.

Published figures come from NISR survey aggregates, the district climate record, the live Open-Meteo forecast and the trained-model report. The dashboard does not estimate a missing figure: a price, premium, application rate, eligibility rule or risk score is shown only when an agronomist records a verified value with its supplier or policy, its source and the date it was checked. A price older than 90 days is labelled for re-checking.

Editable records live in Supabase. The app ships the migration in `supabase/migrations/20261026000000_agronomist_dashboard.sql`, which creates `agronomist_records` and `agronomist_audit`, enables row-level security and records who created or changed each record. Apply it with the Supabase CLI or the SQL editor before expecting stored records:

```bash
supabase db push
```

Only an account whose **app_metadata** carries `role: "agronomist"` can add, edit or delete a record. `user_metadata` is editable by the account holder, so it is never trusted. Grant the role in the Supabase dashboard (Authentication → Users) or with SQL:

```sql
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || '{"role":"agronomist"}'::jsonb
 where email = 'officer@example.org';
```

The server checks the role on every write as well as the database policy, and the audit table keeps the actor, action and record. If the database is not configured or the migration has not been applied, the page still shows the published figures and the reference catalogue, and says plainly that records cannot be changed. A record edited while the connection is down is kept on the device and retried when the page next reaches the server.

### 12.2 Shared reviewer account

The sign-in form prints one shared account so the workspace can be shown without an invitation:

- email `manziemile1@gmail.com`
- password `Manzi12345`

Those two values live in `src/lib/agronomist-accounts.ts` and are shown under the form. The first sign-in creates the account if it does not exist yet (that address only), and the second migration, `20261026010000_agronomist_allowlist.sql`, adds it to `public.agronomist_allowlist`, so `public.is_agronomist()` accepts the address as well as an `app_metadata` role. The server's `isAgronomistClaims` reads the same list, so the app and the policies agree.

The password is public: it is in this repository and on the page. Use the account to demonstrate the dashboard, never to hold a real farmer's records, and change the password or delete the account before a real deployment. Add further addresses in the table **and** in `AGRONOMIST_EMAILS`, or in neither.

Supabase must have the **Email** provider enabled (Authentication → Sign In / Providers). When it is disabled, every sign-in returns `email_provider_disabled` and the form says that an administrator has to enable the provider; no code change can work around it. A confirmed email is not required when "Confirm email" is off; when it is on, the first sign-in creates the account and asks for the address to be confirmed before the next sign-in.

## 13. Technologies Used

ImbutoSmart AI uses a full-stack architecture combining a React-based farmer interface, a FastAPI machine-learning backend, Python data-processing tools, weather services, and optional AI/voice services.

### Frontend Technologies

- **React** — builds the Farmer Advisory and Agronomist Dashboard interfaces.
- **TypeScript / TSX** — application logic and reusable frontend components.
- **CSS** — responsive interface, design tokens, light/dark themes, status colours and layout.
- **React UI primitives** — Panel, Callout, StatusPill and Stat provide consistent farmer-facing interface blocks.

### Backend and API Technologies

- **Python** — data preparation, machine learning and backend services.
- **FastAPI** — REST API and server-side application backend.
- **Uvicorn** — development/application server for the FastAPI backend.
- **scikit-learn** — Random Forest classification and regression models.
- **Joblib model artifacts** — stores trained machine-learning models for deployment.

### Data and Machine Learning

- **NISR Seasonal Agricultural Survey 2025** — primary agricultural training data.
- **NASA POWER and MERRA-2** — district historical climate information used in the documented training pipeline.
- **Open-Meteo** — coming-days weather forecast used by the farmer interface.
- **Pandas / Python data-processing workflow** — used to prepare and transform agricultural data.

### AI and Voice Technologies

- **OpenAI-compatible Chat Completions API** — farmer Q&A and season explanations.
- **Groq** — supported hosted option for AI chat and speech services.
- **Ollama** — supported local AI option.
- **Qwen 2.5 3B** — documented local chat model option.
- **Whisper / faster-whisper** — speech-to-text option in the local voice stack.
- **Kokoro / pyttsx3 and other configured speech backends** — text-to-speech options depending on deployment.
- **FFmpeg** — audio conversion required by the documented local voice setup.

### Deployment and Configuration

- **Render** — documented backend deployment option.
- **Vercel / Netlify / Render** — documented frontend hosting options.
- **Docker** — backend containerization/deployment support.
- **.env environment variables** — server-side configuration for API URLs, AI credentials, speech and email services.

## 14. Recommendation Flow

1. Farmer selects district, soil type and season.
2. The application obtains district climate and forecast weather.
3. ML models evaluate crop success probability and expected yield.
4. The agronomic engine evaluates soil and crop suitability.
5. District-level agricultural input information is added.
6. Seasonal and short-term weather information helps determine when to act.
7. Risk and insurance guidance are included where relevant.
8. The system produces a simple farmer-facing plan and AI explanations.

## 15. Example Recommendation

| Information  | Example                                                        |
| ------------ | -------------------------------------------------------------- |
| District     | Gatsibo                                                        |
| Soil         | Farmer-selected soil type                                      |
| Season       | Season A                                                       |
| Weather      | District climate + coming-days forecast                        |
| Crop ranking | Crops ranked by estimated success and expected yield           |
| Yield        | Displayed in t/ha                                              |
| Input advice | District-level observed input use + agronomic guidance         |
| Risk advice  | Seasonal/weather risk + insurance guidance                     |

## 16. Privacy and Data Protection

- Survey microdata and trained model artifacts are not committed to the repository.
- District input profiles contain aggregate information, not household records.
- District land-use imports are aggregate, non-sensitive figures.
- AI and email credentials are server-side environment variables and must not be committed.

## 17. Running the Project

### Backend

```bash
cd backend
pip install -r requirements.txt
python prepare_training_data.py --microdata "C:/path/to/Microdata"
python ml_pipeline.py
uvicorn main:app --reload --port 8000
```

In this workspace the survey extracts are copied to `dataset/Microdata`, which is git-ignored:

```bash
python build_district_inputs.py --microdata ../dataset/Microdata
python prepare_training_data.py --microdata ../dataset/Microdata
```

### Frontend

```bash
cp .env.example .env
npm install
npm run dev
```

For a production build, preview with `node .output/server/index.mjs` after `npm run build` rather than `vite preview` (the Nitro output lives in `.output`).

The agronomist records use the server-side `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, plus the migration described in section 12.1. No service-role key is needed: the server forwards the signed-in account's token, and the row-level policies decide what that account may read or write. The dashboard's sign-in form, record status and offline notice all stay visible when Supabase is not configured, so the rest of the app still works.


## 18. Deployment

The documented deployment architecture uses **Render** for the FastAPI backend and a static/edge host such as **Vercel, Netlify or Render** for the frontend. Training data and models must be built privately, and the trained model artifacts supplied to the backend. After deployment, verify `/meta` and a real `/predict` request, not only `/health`.

## 19. Future Development

- Offline/hybrid farmer recommendations for limited-connectivity areas.
- Reliable Kinyarwanda speech-to-text and text-to-speech.
- More detailed soil and agronomic datasets.
- Additional real-time meteorological sources.
- Crop disease and pest advisory.
- Market-price and market-access information.
- Deeper agricultural-insurance integration.
- Mobile and SMS delivery for farmers.

## 20. NST2 Alignment

ImbutoSmart AI supports NST2 priorities related to agricultural productivity through data-driven crop selection, higher potential yield per hectare, climate-resilient decision-making and agricultural extension services.

## 21. AI Disclosure

AI assistants were used to architect the ML pipeline, generate UI components and debug code. The core data strategy, NISR data preprocessing logic and system design were implemented by the team.

## 22. Project Vision

> "From agricultural data to better decisions, from better decisions to better harvests."

ImbutoSmart AI aims to bridge the gap between Rwanda's agricultural and meteorological data and the everyday decisions made by farmers, turning complex data into practical, localized and understandable agricultural guidance.
