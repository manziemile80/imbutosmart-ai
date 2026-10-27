# ImbutoSmart AI

## NISR 2026 Big Data Hackathon

### Complete Project Documentation and Technical Overview

**Repository:** [github.com/manziemile80/imbutosmart-ai](https://github.com/manziemile80/imbutosmart-ai)

**Deployed application:** <https://imbutosmart.vercel.app>

---

## Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Main Purpose](#3-main-purpose)
4. [Core Farmer Questions](#4-core-farmer-questions)
5. [Data and Evidence](#5-data-and-evidence)
6. [Machine-Learning Models](#6-machine-learning-models)
7. [Soil, Manure and Agronomic Advice](#7-soil-manure-and-agronomic-advice)
8. [Seasonal Rainfall and When to Act](#8-seasonal-rainfall-and-when-to-act)
9. [Agricultural Insurance Advice](#9-agricultural-insurance-advice)
10. [AI Assistance](#10-ai-assistance)
11. [Voice and Language Support](#11-voice-and-language-support)
12. [Application Structure](#12-application-structure)
13. [Technologies Used](#13-technologies-used)
14. [Recommendation Flow](#14-recommendation-flow)
15. [Example Recommendation](#15-example-recommendation)
16. [Privacy and Data Protection](#16-privacy-and-data-protection)
17. [Running the Project](#17-running-the-project)
18. [Deployment](#18-deployment)
19. [Future Development](#19-future-development)
20. [Hybrid and Offline AI Capability](#20-hybrid-and-offline-ai-capability)
21. [Updated Project Vision](#21-updated-project-vision)

---

# 1. Project Overview

ImbutoSmart AI is an intelligent agricultural decision-support platform designed to transform Rwanda's agricultural and meteorological data into practical, localized and understandable advice for farmers.

The system uses agricultural survey data, district climate information, weather forecasts, machine-learning models and agronomic knowledge to help farmers make better decisions about what to grow, when to act and how to manage their crops.

A Random Forest classifier estimates the probability that a crop will succeed under the selected district, soil and seasonal/weather conditions, while a Random Forest regressor estimates expected yield in tonnes per hectare (t/ha). Crops are ranked according to estimated success and expected yield.

The platform extends these predictions with:

- District climate information.
- Coming-days weather forecasts.
- Soil and crop suitability.
- Fertilizer, manure and input guidance.
- Seasonal agricultural advice.
- Agricultural risk information.
- Insurance awareness.
- Agronomist assistance.
- AI-powered farmer questions and answers.
- Voice assistance.
- English, Kinyarwanda and French text support.
- Hybrid online/offline agricultural recommendations.

The system is designed to remain useful whether the farmer has an internet connection or not.

## NST2 Alignment

ImbutoSmart AI supports agricultural productivity, improved potential yield per hectare, climate-resilient crop selection, data-driven decision-making and agricultural extension services.

---

# 2. Problem Statement

Rwandan farmers need clear and localized information to decide what to plant and how to manage production under different soil, seasonal and weather conditions.

Agricultural, weather and agronomic information can be difficult to combine into one practical decision. Farmers may have access to individual pieces of information but lack a system that brings these sources together and translates them into simple recommendations.

Connectivity is also an important challenge. Some farmers may experience unreliable, expensive or unavailable internet connectivity. A system that depends completely on continuous internet access may therefore become unavailable exactly when a farmer needs agricultural guidance.

ImbutoSmart AI addresses these challenges by combining NISR agricultural survey information with district climate, forecast weather, machine-learning models and a separate agronomic suitability engine.

The system provides farmer-facing recommendations rather than simply displaying raw datasets or machine-learning outputs.

Its hybrid architecture also allows essential agricultural recommendations to continue working when there is no internet connection, using locally stored agricultural information, models and cached data.

---

# 3. Main Purpose

The purpose of ImbutoSmart AI is to transform agricultural and meteorological data into simple, localized and actionable advice that helps farmers:

- Choose suitable crops.
- Understand the probability of crop success.
- Estimate potential yield.
- Understand rainfall and seasonal conditions.
- Manage soil and agricultural inputs.
- Understand manure and fertilizer options.
- Decide when to act based on seasonal and weather conditions.
- Understand agricultural risks.
- Make informed insurance decisions.
- Ask agricultural questions using AI.
- Receive assistance in understandable languages.
- Continue receiving essential recommendations even when internet connectivity is unavailable.

---

# 4. Core Farmer Questions

ImbutoSmart AI is designed to answer questions such as:

- Which crops are suitable for my district and soil?
- What is the estimated probability that each crop will succeed?
- What yield can I expect in tonnes per hectare?
- What are the usual rainfall and temperature conditions in my district?
- What weather is expected in the coming days?
- What agricultural inputs are commonly used in my district?
- What are the observed application rates of these inputs?
- What type of manure or fertilizer may be appropriate?
- When should I act based on seasonal and forecast conditions?
- What insurance should I ask about when production risk is high?
- Can I receive advice in simple language?
- Can I receive information in Kinyarwanda, English or French?
- Can I still receive crop recommendations when there is no internet?

---

# 5. Data and Evidence

## 5.1 NISR Seasonal Agricultural Survey 2025

The training data come from NISR Seasonal Agricultural Survey 2025 microdata covering Seasons A, B and C.

The prepared training table contains:

- 51,225 crop observations.
- 30 districts.
- 12 crops.
- 3 agricultural seasons.

The crop names are mapped to the crop categories offered by the application.

The survey records district, crop, area, harvest information and sampling weight.

The microdata and trained models remain outside the public repository and are built locally.

## 5.2 District Climate and Weather

Because the survey does not record plot-level soil type or plot-level weather, machine-learning training rows use district climate for the relevant season.

The project builds district climate using the published 2001–2020 record from NASA POWER and MERRA-2 at district-centre locations, together with weather information from the 2025 survey year.

The farmer interface separates:

**Usual district climate**

from

**Coming-days weather forecast.**

Historical climate information comes from NASA POWER, while coming-days forecasts come from Open-Meteo. Both are fetched server-side and their sources are shown on the page.

---

# 6. Machine-Learning Models

## 6.1 Crop Success Classifier

A Random Forest classifier estimates the probability that a crop will succeed under the district, the season and the weather conditions represented by the model.

The classifier is fitted on the prepared survey table, where each row is one surveyed crop in one district during one season. The output is a probability between 0 and 1, shown to the farmer as a percentage, so the interface can say "this crop has a reasonable chance" rather than simply listing crops.

Crops are ranked by that estimated success probability together with the expected yield from the regressor, so the farmer receives an order to act on rather than a raw model score.

## 6.2 Expected Yield Regressor

A Random Forest regressor estimates expected yield in tonnes per hectare. Crops can then be ranked using estimated success probability and expected yield.

The regressor is trained on the same prepared table as the classifier. The two outputs are shown together on the farmer page: a success probability as a percentage and a yield figure in t/ha, with the number of survey observations behind the estimate.

## 6.3 Model Evaluation

On a held-out fifth of the survey data, the current project reports **classifier AUC 0.94** and **yield-regressor R² 0.81**, with per-crop yield errors including **0.84 t/ha for maize** and **0.29 t/ha for beans**.

The project also notes that 2025 was a below-average rainfall year, so learned yields reflect a relatively dry survey year and should be read as a guide rather than a promise.

The model report is available to the application and to the agronomist dashboard, so the figures quoted in advice are the figures the models actually scored.

---

# 7. Soil, Manure and Agronomic Advice

Farmer-selected soil is not treated as a measured variable in the machine-learning training model. The survey does not record plot-level soil type, so soil is used by a separate knowledge-based agronomic suitability engine instead. This distinction prevents the system from implying that the NISR survey directly measured plot-level soil.

The agronomic engine scores crops against the farmer's soil, season and water availability, and records which factors it was given. A missing factor is named rather than filled in with an estimate.

The Guidance portal provides district-level information about **DAP, NPK, urea, manure, compost** and other inputs, including observed application rates in kg/ha, together with irrigation and soil-erosion indicators. These are aggregate district profiles rather than household-level data.

The dashboard goes further for agricultural officers: a price, premium or application rate is shown only when an officer records a verified value with its supplier or policy, its source and the date it was checked. A price older than 90 days is labelled for re-checking.

---

# 8. Seasonal Rainfall and When to Act

The system combines the district's usual seasonal rainfall and temperature with the coming-days forecast to help the farmer decide when to act.

Rainfall information is presented as statistical or forecast guidance, not as a guarantee that a particular amount of rain will occur.

The season guide explains what each season is for in the farmer's language, and the season assistant can add an explanation when an AI service is available. When it is not, the deterministic reference summary for the chosen month stays on the page.

---

# 9. Agricultural Insurance Advice

Insurance-related guidance is included in the farmer summary. The system helps the farmer identify insurance worth asking about in relation to agricultural risk. It is decision support and awareness, not an insurance contract or guarantee of coverage.

District and soil provide context for the conversation, never a risk score, an eligibility ruling, a premium or an insurer ranking. The guidance names official program information and asks the farmer to confirm the policy before acting.

Coverage preferences a farmer selects are kept separate from policy enrolment, so choosing what to ask about never implies a purchase.

---

# 10. AI Assistance

The farmer Q&A assistant and season explanations use an OpenAI-compatible chat-completions endpoint. The farmer assistant answers agronomic questions in the farmer's language, while the agronomist assistant uses figures displayed by the dashboard, the model report and district climate. The model is instructed to use the supplied evidence and say when a figure is missing.

The system can use a hosted provider such as **Groq** or a local **Ollama** model. The documented local configuration uses `qwen2.5:3b` for chat and a separate local speech backend.

Every AI call is made from the server through the app's own gateway, configured by `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL`. No provider, gateway or credential is hardcoded, and the browser never receives one.

The agronomist assistant answers from a digest of the figures the dashboard shows, built on the server from the published survey figures, the model report and the district's climate. The model is told to quote no other number and to name a figure that is missing. A written plan may only quote figures its digest holds: an application rate, a spacing or a price the model adds is dropped before the farmer sees it.

---

# 11. Voice and Language Support

The Guidance portal provides **Ask a question**, **Speak your question**, **This season** and **My plan**. The page is available in **English, Kinyarwanda and French**.

The language is chosen once in the header and shared across the app, so the farmer page, the advice, the plan, the PDF and the AI answers all use the same language. The header shows the language in use as a flag and a short code, and the panel names each language in its own words.

The current local speech configuration declares English as the supported spoken language. Kinyarwanda and French answers remain available as written responses unless a speech backend that reliably supports those languages is configured.

The server reports which app languages the speech backend can speak aloud, and a language it cannot read is offered as writing only rather than spoken badly. A speech backend that cannot serve requests at all is not shown as an error: the answer stays written, the panel says so calmly, and the reason is reported to whoever runs the deployment.

---

# 12. Application Structure

The project uses a FastAPI + scikit-learn backend and a React web application. The backend contains data preparation, the machine-learning pipeline and API code; the frontend contains the Farmer Advisory and Agronomist Dashboard interfaces.

```
backend/            FastAPI + scikit-learn
src/                React web application
src/components/ui/  reusable Panel, Callout, StatusPill and Stat primitives
src/styles.css      shared design tokens and light/dark theme values
```

The app has five menu pages, each owning one job:

- **Farmer** — the field controls (district, soil, season) and the automatic recommendation.
- **Advice** — the agronomic explanation of the recommendation.
- **Guidance** — the help desk, holding every assistant.
- **File** — the whole summary and its PDF download.
- **Dashboard** — the agronomist workspace.

## 12.1 Agronomist Dashboard

The `/dashboard` page is the advisory workspace for agricultural officers. It reads the same district, soil and season that the farmer sets on the Farmer page, and it has thirteen modules: overview, manure and fertiliser, agronomist contacts, farmer profiles, crop-advice review, soil and nutrients, weather risk, pests and disease, insurance, farmer messages, the knowledge centre, reports and follow-up, and offline data.

Published figures come from NISR survey aggregates, the district climate record, the live Open-Meteo forecast and the trained-model report. The dashboard does not estimate a missing figure: a price, premium, application rate, eligibility rule or risk score is shown only when an agronomist records a verified value with its supplier or policy, its source and the date it was checked. A price older than 90 days is labelled for re-checking.

Editable records live in a shared Supabase project, so every device signed in with the same account sees the same list. The migrations in `supabase/migrations/` create `agronomist_records` and `agronomist_audit`, add the reviewer allowlist, enable row-level security and record who created or changed each record.

Only an account whose **app_metadata** carries `role: "agronomist"` can add, edit or delete a record. `user_metadata` is editable by the account holder, so it is never trusted. The server checks the role on every write as well as the database policy, and the audit table keeps the actor, action and record.

The cloud store is the primary path: when the deployment has a shared database, records are written there and the page shows a **Shared database** pill instead of any device notice. A copy is cached for an offline visit, so a change made while the connection is down is kept on the device and retried when the page next reaches the server. Only when the deployment has no shared database at all, or its migration has not been applied, does the dashboard fall back to a store in the browser. The shared reviewer account unlocks that fallback with the same printed credentials, and a calm **Saved on this device** strip says once that the records stay here and are not shared.

A count is a fact only when the store was actually read: a shared database and a device store are both counted, so an empty one is a real `0`, while a store that could not be read shows **—** rather than claiming nothing is stored.

## 12.2 Shared Reviewer Account

The sign-in form prints one shared account so the workspace can be shown without an invitation:

- email `manziemile1@gmail.com`
- password `Manzi12345`

The password is public: it is in the repository and on the page. Use the account to demonstrate the dashboard, never to hold a real farmer's records, and change the password or delete the account before a real deployment.

## 12.3 Offline Mode

The recommendation engine, the local model and the plan builder run on the device, and every menu page is warmed in memory, so the farmer can still get a ranked recommendation, a plan and its PDF with no connection. The design note [`hybrid-and-offline-ai.md`](./hybrid-and-offline-ai.md) describes the behaviour module by module.

---

# 13. Technologies Used

ImbutoSmart AI uses a full-stack architecture combining a React-based farmer interface, a FastAPI machine-learning backend, Python data-processing tools, weather services, and optional AI/voice services.

## Frontend Technologies

- **React** — builds the Farmer Advisory and Agronomist Dashboard interfaces.
- **TypeScript / TSX** — application logic and reusable frontend components.
- **TanStack Start and Router** — routing, server functions and the app shell.
- **CSS** — responsive interface, design tokens, light/dark themes, status colours and layout.

## Backend and API Technologies

- **Python** — data preparation, machine learning and backend services.
- **FastAPI** — REST API and server-side application backend.
- **scikit-learn / pandas** — Random Forest training and data processing.
- **Zod** — request validation shared between the browser and the server functions.

## Data and Machine Learning

- **NISR Seasonal Agricultural Survey 2025** — primary agricultural training data.
- **NASA POWER and MERRA-2** — district historical climate information used in the documented training pipeline.
- **Open-Meteo** — coming-days weather forecast used by the farmer interface.
- **Pandas / Python data-processing workflow** — used to prepare and transform agricultural data.

## AI and Voice Technologies

- **OpenAI-compatible Chat Completions API** — farmer Q&A and season explanations.
- **Groq** — supported hosted option for AI chat and speech services.
- **Ollama** — supported local AI option.
- **Qwen 2.5 3B** — documented local chat model option.
- **Whisper / faster-whisper** — speech-to-text option in the local voice stack.
- **Kokoro / pyttsx3 and other configured speech backends** — text-to-speech options depending on deployment.
- **FFmpeg** — audio conversion required by the documented local voice setup.

## Deployment and Configuration

- **Render** — documented backend deployment option.
- **Vercel / Netlify / Render** — documented frontend hosting options.
- **Docker** — backend containerization/deployment support.
- **Supabase** — shared database and authentication for the agronomist records.
- **.env environment variables** — server-side configuration for API URLs, AI credentials, speech and email services.

---

# 14. Recommendation Flow

1. Farmer selects district, soil type and season.
2. The application obtains district climate and forecast weather.
3. The models evaluate crop success probability and expected yield.
4. The agronomic engine evaluates soil and crop suitability.
5. District-level agricultural input information is added.
6. Seasonal and short-term weather information help determine when to act.
7. Risk and insurance guidance are included where relevant.
8. The system produces a simple farmer-facing plan and AI explanations.

When the backend is unreachable, steps 2, 3 and 8 fall back to the bundled climate record, the bundled model and the deterministic explanation, and the result says which path answered.

---

# 15. Example Recommendation

| Information  | Example                                                  |
| ------------ | -------------------------------------------------------- |
| District     | Gatsibo                                                  |
| Soil         | Farmer-selected soil type                                |
| Season       | Season A                                                 |
| Weather      | District climate + coming-days forecast                  |
| Crop ranking | Crops ranked by estimated success and expected yield     |
| Yield        | Displayed in t/ha                                        |
| Input advice | District-level observed input use + agronomic guidance   |
| Risk advice  | Seasonal/weather risk + insurance guidance               |

---

# 16. Privacy and Data Protection

- Survey microdata and trained model artifacts are not committed to the repository.
- District input profiles contain aggregate information, not household records.
- District land-use imports are aggregate, non-sensitive figures.
- AI and email credentials are server-side environment variables and must not be committed.
- The shared reviewer account is for demonstration only; a real farmer's records never belong in it.

---

# 17. Running the Project

## Backend

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

## Frontend

```bash
cp .env.example .env
npm install
npm run dev
```

For a production build, preview with `node .output/server/index.mjs` after `npm run build` rather than `vite preview` (the Nitro output lives in `.output`).

---

# 18. Deployment

The documented deployment architecture uses **Render** for the FastAPI backend and a static/edge host such as **Vercel, Netlify or Render** for the frontend. Training data and models must be built privately, and the trained model artifacts supplied to the backend. After deployment, verify `/meta` and a real `/predict` request, not only `/health`.

The live application is deployed on Vercel at <https://imbutosmart.vercel.app>. Deployment checks are scripted: `scripts/test-app-ai-e2e.mjs` exercises the app's own server functions (voice configuration, English and Kinyarwanda questions, the season explanation and a speech round trip), and `scripts/test-app-email-e2e.mjs` checks the server-side summary email.

---

# 19. Future Development

- Packaged offline install (service worker and app shell) so the offline mode also survives a full page reload with no connection.
- Reliable Kinyarwanda speech-to-text and text-to-speech.
- More detailed soil and agronomic datasets.
- Additional real-time meteorological sources.
- Crop disease and pest advisory.
- Market-price and market-access information.
- Deeper agricultural-insurance integration.
- Mobile and SMS delivery for farmers.

---

# 20. Hybrid and Offline AI Capability

ImbutoSmart AI is designed to support farmers both **when an internet connection is available and when there is limited or no internet connectivity**. This hybrid approach is important because some farmers may live or work in areas where internet connectivity is unreliable, expensive, or completely unavailable.

The app takes the richer path when it can reach the server and falls back to the one on the device when it cannot, without asking the farmer to choose a mode.

- **20.1 Online mode** — coming-days forecasts from Open-Meteo, shared agronomist records through the cloud database, AI questions and answers, updated seasonal and weather information, current recommendations and insurance guidance, record synchronization, and voice assistance where the speech services are configured.
- **20.2 Offline mode** — crop recommendations and suitability from the district and soil, success probability and expected yield from the bundled model, seasonal and agronomic guidance, the district climate record, soil and input guidance, insurance awareness, a local AI explanation where the device supports one, and the plan with its PDF. Offline weather is shown as stored or previously synchronized information, never as a live forecast.
- **20.3 Local AI** — the documented architecture supports **Ollama with Qwen 2.5 3B** as a local chat model, served through the same app gateway as a hosted provider, so no credential reaches the browser. The local model answers from the evidence on the device and says when a figure is unavailable rather than inventing one.
- **20.4 Synchronization** — the app checks the connection, uses online services when it can, caches what it needs, switches to local data when the connection drops, and synchronizes again when it returns.
- **20.5 Offline recommendation principle** — a recommendation is an estimated suitability or probability from the local data and models, never a guaranteed outcome. For Gatsibo in Season A the farmer still receives recommended crops, an estimated success probability, an expected yield where available, a soil suitability explanation, seasonal guidance and stored input guidance.
- **20.6 Limitations** — a forecast cannot be guaranteed current, newly published information cannot be retrieved, cloud records cannot synchronize immediately, and local AI depends on the model being installed and the device having the resources to run it. The app reports what it could not fetch instead of showing a stale figure.
- **20.7 Purpose** — *Connected when possible, useful when offline, synchronized when connected again.*

The detailed design note, including what the current build implements and what remains, is [`docs/hybrid-and-offline-ai.md`](./hybrid-and-offline-ai.md).

---

# 21. Updated Project Vision

ImbutoSmart AI aims to bridge the gap between Rwanda's agricultural and meteorological data and the everyday decisions made by farmers. It transforms complex agricultural information into practical, localized and understandable guidance while ensuring that farmers can continue accessing essential recommendations even when internet connectivity is unavailable.

The long-term vision is to provide a **hybrid AI agricultural assistant** that combines machine learning, agricultural statistics, weather information, agronomic knowledge, local AI and offline technology to support better crop decisions, better farm management and more climate-resilient agriculture.

> **"From agricultural data to better decisions, from better decisions to better harvests — online or offline."**
