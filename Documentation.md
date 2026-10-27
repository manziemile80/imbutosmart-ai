# ImbutoSmart AI — Project Documentation

**A hybrid agricultural decision-support system for Rwandan farmers: connected when possible, useful when offline, synchronized when connected again.**

NISR 2026 Big Data Hackathon · Repository: <https://github.com/manziemile80/imbutosmart-ai> · Live application: <https://imbutosmart.vercel.app>

This file holds the full description of the project. `README.md` is the short technical overview; this document explains the system, its hybrid design, its data, its models and its limits.

---

## 1. What ImbutoSmart AI is

ImbutoSmart AI turns Rwanda's agricultural survey data, district climate records and weather forecasts into one simple recommendation: what to plant this season, how much yield to expect, and how to manage the crop once it is in the ground.

Behind that recommendation sit two machine-learning models and a knowledge-based agronomic engine:

- a **Random Forest classifier** that estimates the probability a crop will succeed;
- a **Random Forest regressor** that estimates the expected yield in tonnes per hectare;
- a **crop suitability engine** that scores soil, season, rainfall, temperature and water availability, and names any factor it was not given.

The models are trained on the **NISR Seasonal Agricultural Survey 2025**: 51,225 crop observations across 30 districts, 12 crops and 3 seasons. On a held-out fifth of the data the classifier reaches **AUC 0.94** and the yield regressor **R² 0.81**, with per-crop errors including 0.84 t/ha for maize and 0.29 t/ha for beans. The survey was taken in a below-average rainfall year, so the yields it learned are a guide, not a promise.

Around the prediction, the app adds district climate, the coming-days forecast, manure and fertiliser guidance, seasonal advice, insurance awareness, a farmer Q&A assistant, speech, and a workspace for agricultural officers.

The app is available in **English, Kinyarwanda and French**.

## 2. Hybrid by design — the core of the system

**ImbutoSmart AI is a hybrid system.** That is not a side feature: it is how the product is built. A farmer in a field with one bar of signal gets the same advice as a farmer on office wi-fi, and the app never asks them to pick a mode.

The app takes the richer path when it can reach the server, and falls back to the path on the device when it cannot.

| Capability | With a connection | Without a connection |
| --- | --- | --- |
| Crop advice | The trained model served by the backend, with the browser ranking engine beside it | The ranking engine in `src/lib/recommendation-engine.ts` and the model bundled in `src/lib/local-model.ts` |
| District climate and weather | The app's weather function: the published district climate record plus the live Open-Meteo forecast | No weather figure is shown rather than one being estimated |
| Season guidance | The AI season explanation, grounded in the shared season guide | The deterministic reference summary for the chosen month |
| Questions and voice | The farmer Q&A assistant, speech playback and transcription | The assistant says it could not answer just now, the spoken controls are not offered, and the written guidance stays on the page |
| Plan and PDF | The whole summary on the File page, downloaded as a PDF | The summary and its PDF built in the browser; a section whose source is unavailable is left out rather than estimated |
| Navigation | Every menu page preloaded in the background | The pages already warmed stay available between visits |
| Agronomist records | Written to the shared Supabase database | Kept on the device with a `devices-` id and retried when the server is next reachable |

A few details make the hybrid path trustworthy:

- **The connection is actually checked.** `src/hooks/use-network.ts` reads `navigator.onLine` and then probes the app's own origin, because a device can claim to be online while the app is unreachable. A flaky connection switches the farmer to the offline engine and back on its own.
- **Every menu page is warmed.** After the first paint, and again each time the connection returns, `src/hooks/use-route-warmup.ts` preloads the five pages in the background, so moving between them keeps working after the signal drops.
- **Nothing is invented to fill a gap.** The ranking engine records which factors it was given and names the ones it could not fill. A weather figure is not shown when it cannot be fetched. An AI answer may only quote figures from the digest it was handed.
- **A failure stays quiet.** A page that cannot be preloaded, a forecast that does not arrive or a speech backend that cannot answer is retried or left unwritten, never shown as an error the farmer cannot act on.

The principle is simple: **connected when possible, useful when offline, synchronized when connected again.**

## 3. What the farmer meets

The app has five menu pages, each owning one job:

- **Farmer** — the field controls (district, soil, season) and the automatic recommendation: the crop, its success probability as a percentage, the expected yield in t/ha, and the number of survey observations behind it.
- **Advice** — the agronomic explanation: why this crop, what the soil and water conditions suit, and what the district's observed input use looks like.
- **Guidance** — the help desk. Every assistant lives here in plain words: *Ask a question*, *Speak your question*, *This season* and *My plan*.
- **File** — the whole summary of the plan, with one action: download it as a PDF named for the field. The PDF carries every section the page shows.
- **Dashboard** — the advisory workspace for agricultural officers.

The district, soil and season are set once on the Farmer page and belong to the app, so the header, the assistants, the File page and the dashboard all answer for the same field.

The frame is phone-first: one notch-safe gutter shared by the header, pages and footer, fluid titles, finger-sized controls on a touch screen, and a full menu from tablet width up.

## 4. Data and evidence

**NISR Seasonal Agricultural Survey 2025.** The survey records district, crop, area, harvest information and sampling weight. It does not record plot-level soil type or plot-level weather, so training rows use district climate for the relevant season, and the farmer's soil is handled by the agronomic engine instead. That separation stops the app implying the survey measured a farmer's soil.

**District climate.** Built from the published **NASA POWER / MERRA-2 2001–2020** record at district-centre locations, together with weather from the 2025 survey year. The figures ship with the app as `src/lib/district-climate.json`.

**Coming-days forecast.** Fetched from **Open-Meteo** through the app's own weather function. The interface keeps the usual district climate and the coming-days forecast visibly separate, and shows the source of each.

**District land use.** Bundled, openly licensed district boundaries and aggregate land-use figures, with their attribution. Where a district measurement is missing it stays unavailable rather than being inferred from national totals.

The survey microdata and the trained models stay out of the repository; they are built locally from the survey extracts.

## 5. Soil, manure and inputs

The farmer's soil is used by the knowledge-based suitability engine, not by the trained model. Agricultural officers see district-level information on **DAP, NPK, urea, manure and compost**, including observed application rates in kg/ha, with irrigation and soil-erosion indicators.

These are aggregate district profiles. A price, premium, application rate, eligibility rule or risk score appears only when a verified value is recorded with its supplier or policy, its source and the date it was checked; a price older than 90 days is labelled for re-checking.

## 6. AI and voice

The farmer Q&A assistant and the season explanations run against an **OpenAI-compatible chat-completions endpoint**, called from the server through the app's own gateway and configured by `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL`. No provider, gateway or credential is hardcoded, and the browser never holds one.

The documented architecture supports a hosted provider such as **Groq** and a free local stack: **Ollama with `qwen2.5:3b`** for chat, with a separate local speech backend for playback and transcription. Either way the contract is the same:

- the agronomist assistant answers from a digest of the figures the dashboard shows — the published survey figures, the model report and the district's climate — and is told to quote no other number and to name a figure that is missing;
- a written plan may only quote figures its digest holds, so an application rate, spacing or price the model invents is dropped before the farmer sees it;
- a season explanation that states a measurement is replaced by the deterministic reference summary, because the season guide holds none.

Speech is optional and never in the way. The server reports which app languages the speech backend can actually speak, so a language it cannot read is offered as writing only rather than spoken badly. A backend that cannot serve requests at all is not an error the farmer sees: the answer stays written, the panel says so calmly, and the reason is reported to whoever runs the deployment.

## 7. The agronomist dashboard

`/dashboard` is the workspace for agricultural officers, with thirteen modules: overview, manure and fertiliser, agronomist contacts, farmer profiles, crop-advice review, soil and nutrients, weather risk, pests and disease, insurance, farmer messages, the knowledge centre, reports and follow-up, and offline data.

Records live in a shared **Supabase** project, so every device signed in sees the same list. The migrations create `agronomist_records` and `agronomist_audit`, add the reviewer allowlist, enable row-level security and record who created or changed each record. Only an account whose `app_metadata` carries `role: "agronomist"` can write, and the server checks that role on every write as well as the policy does.

The hybrid rule applies here too. A change made while the connection is down is kept on the device and retried when the server is reachable. Only when the deployment has no shared database at all does the workspace fall back to a browser store, and then a calm strip says once that the records stay on this device. A count is a fact only when the store was actually read: an empty store is `0`, while a store that could not be read shows **—**.

A shared reviewer account is printed on the sign-in form for demonstrations. Its password is public in the repository, so it must never hold a real farmer's records.

## 8. Privacy

- Survey microdata and trained model artifacts are not committed.
- District input profiles, land-use figures and climate records are aggregates, not household data.
- AI, speech, email and database credentials are server-side environment variables and never reach the browser.
- The shared reviewer account is for demonstration only.

## 9. Running and deploying

**Backend**

```bash
cd backend
pip install -r requirements.txt
python prepare_training_data.py --microdata "C:/path/to/Microdata"
python ml_pipeline.py
uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cp .env.example .env
npm install
npm run dev
```

A production build is served from the Nitro output: `npm run build`, then `node .output/server/index.mjs`.

The frontend is deployed on **Vercel** at <https://imbutosmart.vercel.app>; the documented backend host is **Render**. A deployment is only healthy for predictions once `/meta` and a real `/predict` request answer, not `/health` alone. Two scripted checks exercise the running app: `scripts/test-app-ai-e2e.mjs` (voice configuration, English and Kinyarwanda questions, the season explanation and a speech round trip) and `scripts/test-app-email-e2e.mjs` (the server-side summary email).

Run the app's own checks locally with:

```bash
npm test
npx tsc --noEmit
npm run build
```

## 10. Limits, and what comes next

The hybrid design is honest about what a device alone cannot do:

- a coming-days forecast cannot be guaranteed current without a connection, so no stale one is passed off as live;
- newly published agricultural information, prices and policies cannot be retrieved until the connection returns;
- local AI depends on the model being installed and the device having the resources to run it;
- there is no service worker yet, so a full page reload with no connection still needs the network — the pages are warmed in memory, not installed.

Next on the roadmap: the packaged offline install, reliable Kinyarwanda speech, deeper soil and agronomic datasets, more meteorological sources, pest and disease advisory, market prices, insurance integration, and mobile/SMS delivery.

---

> **"From agricultural data to better decisions, from better decisions to better harvests — online or offline."**
