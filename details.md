# ImbutoSmart AI — project details

ImbutoSmart AI turns Rwanda's national agricultural survey into advice a farmer can
act on. A farmer says where they farm (district), what the soil is and which season
they are in; the app answers what to plant, what inputs farmers around them use and
at what rate, when to act in the season, what insurance to ask about, and it can
explain any of that aloud in English, Kinyarwanda or French.

- Live deployment: **https://imbutosmart.vercel.app**
- Built for: NISR Big Data Hackathon (Seasonal Agricultural Survey 2025 microdata)
- Stack: TanStack Start + React 19 + Vite + Tailwind v4, on Vercel; FastAPI +
  scikit-learn on Render for the trained models.

---

## 1. The one rule that shapes the app

**No figure is ever invented.** Every number a farmer sees comes from a source the
app can name:

| Kind of figure                                           | Source                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Crops that suit the field, and how well each fits        | agronomic suitability engine (`recommendation-engine.ts`), scored per district/soil/season |
| Inputs farmers in the district use, and the rate applied | Seasonal Agricultural Survey 2025 aggregates (`district-inputs.json`)                      |
| Season rainfall and temperature                          | published 2001–2020 record, NASA POWER / MERRA-2 (`district-climate.json`)                 |
| The days ahead                                           | live Open-Meteo forecast (`weather.server.ts`)                                             |
| Share of households growing a crop nationally            | survey aggregates (`ahs-crops.ts`)                                                         |
| Insurance program, eligibility rules                     | official program link only — never a premium, score or ranking                             |

Consequences that are enforced in code, not just in copy:

- A rate with fewer than five survey samples, or no source at all, is **never
  stated** by the app.
- An AI answer is post-filtered: any line that quotes a number the app's own digest
  does not hold is **dropped before the farmer sees it** (`grounding.ts`,
  `groundToDigest`).
- A whole answer that states a measurement the season guide does not contain is
  replaced by the deterministic reference summary (`season-assistant` path).
- When a source cannot be reached, the page says so calmly and keeps what the farmer
  typed. It never fills the gap with a guess.
- Insurance copy states the program the farmer should _ask about_ and requires the
  policy wording to decide; it never claims eligibility, cover or price.

---

## 2. The pages

| Route        | Portal                                             | What lives there                                                                                                                                                                |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | **Farmer** (`index.tsx`)                           | The field form, the crop estimate, the season assistant with the district weather card, insurance guidance, the detailed crop recommendation and the question/voice assistants. |
| `/advice`    | **Advice** (`advice.tsx`)                          | The plan to follow: crops for the field, the district's inputs with kg/ha rates, when to act, the written plan, and assistance (read aloud, simpler words, glossary).           |
| `/guidance`  | **Guidance** (`guidance.tsx` → `GuidancePage.tsx`) | The help desk: every assistant in plain words — ask a question, speak a question, this season, my plan — plus a "how to get a good answer" guide.                               |
| `/dashboard` | **Agronomist** (`dashboard.tsx`)                   | Rwanda's figures: land use, crop prevalence, the district land-use map (CSV import), and the agronomist assistant.                                                              |

Navigation order is Farmer → Advice → Guidance → Agronomist.

### The farmer's field is app state, not page state

`district`, `soil` and `season` live in one context (`FieldProvider` in
`src/lib/field-context.tsx`, types and copy in `src/lib/field.ts`) and are persisted
to `localStorage` under `imbutosmart-field`, read after the first render so server
markup and client markup agree.

Every surface reads and writes that one field:

- the header summary and the summary panel,
- the Farmer page,
- the Advice page,
- the Guidance page (its own field panel writes the same values).

Change the district anywhere and the summary, the plan and the assistants all follow
— no stale copy of a farmer's field anywhere in the app.

---

## 3. Header

Two lines, by design:

1. **Title line** — the logo mark (`public/logo.svg`), the wordmark _ImbutoSmart AI_,
   and the summary bell at the far right.
2. **Navigation line** — Farmer / Advice / Guidance / Agronomist, and the dark-mode
   toggle at the right, directly below the bell.

The bell opens the farmer's summary on any page: crops for the field, inputs farmers
there use _with the rate they applied_, the insurance worth asking about, what else
to do, and a **Send me this summary** action (browser notification). The panel is a
column: the title and the action stay put while the figures scroll, so the action is
never below the fold on a short screen.

On a phone the navigation stays one row and scrolls sideways, fading at its right
edge rather than ending mid-word. The header is the same on every page because it
lives in `SiteShell.tsx`.

---

## 4. Architecture

### Layers

```
src/routes/*            route shells + the page text for that route
src/components/*        the panels (farmer, advice, guidance, dashboard blocks)
src/components/ui/*     shared primitives: Panel, PanelHeader, PanelBody, Callout,
                        StatusPill, Stat, Button, Textarea, Checkbox (native input)
src/hooks/*             client behaviour: field weather, auto prediction, voice, theme
src/lib/*               browser-safe logic, copy catalogs, data aggregates
src/lib/*.functions.ts  server functions (the only way the browser reaches the server)
src/lib/ai/*            server-only: chat gateway, speech, error codes
src/lib/*.server.ts     server-only data access (weather, AI gateway)
src/start.ts            request/function middleware: error page, CSRF, optional auth
```

Two hard boundaries:

- **Browser-safe modules** hold the reference data, the validation and the copy
  (season guide, insurance catalog, farmer language catalog, plan summary). They can
  be imported by tests and by the client.
- **Server-only modules** (`*.server.ts`, `src/lib/ai/*`) hold credentials and the
  provider calls. They are only ever imported from a server function handler, so the
  keys never enter the browser bundle.

### Server functions

| Function                 | File                            | Purpose                                     |
| ------------------------ | ------------------------------- | ------------------------------------------- |
| `getDistrictWeather`     | `weather.functions.ts`          | climate + live forecast for a district      |
| `recommendCropsOnline`   | `recommendation.functions.ts`   | ask the trained model service               |
| `syncRecommendations`    | `recommendation.functions.ts`   | sync the session's recommendations          |
| `getAdvice`              | `advice.functions.ts`           | the written plan (digest-grounded)          |
| `explainSeason`          | `season-assistant.functions.ts` | season explanation in the farmer's language |
| `askFarmerAssistant`     | `farmer-chat.functions.ts`      | the farmer Q&A thread                       |
| `askAgronomist`          | `agronomist-chat.functions.ts`  | answers from the dashboard's digest         |
| `getVoiceConfigStatus`   | `voice-assistant.functions.ts`  | which languages may be spoken               |
| `transcribeFarmerSpeech` | `voice-assistant.functions.ts`  | speech → text                               |
| `askVoiceAssistant`      | `voice-assistant.functions.ts`  | a recorded question → an answer             |
| `speakFarmerText`        | `voice-assistant.functions.ts`  | text → audio                                |

Every one of these must work on a deployment with **no optional service
configured**. A missing key, a backend that refuses terms, a dead provider — all of
them leave the answer as it is; none of them stop the call from being made.

`src/start.ts` adds three middlewares: an HTML error page for unexpected failures,
CSRF protection for server functions, and an _optional_ auth token. That last one is
deliberately forgiving — if Supabase is not configured, the call goes out without a
token instead of failing (this was a production outage once; the comment in the file
records it).

---

## 5. Data

### Survey (NISR Seasonal Agricultural Survey 2025, Seasons A/B/C)

- 51,225 crop observations, 30 districts, 12 crops, 3 seasons.
- Fertiliser columns used by the builder: names `s3q101–104`, units `s3q111–114`,
  amounts `s3q121–124`, areas `s3q141–144`, crops `s3q151–154`; district alias
  `Nyarugenege` → `Nyarugenge`.
- `backend/prepare_training_data.py` → `backend/nisr_real_data.csv` (training table).
- `backend/build_district_inputs.py` → `src/lib/district-inputs.json` (per-district
  shares, kg/ha rates, irrigation and erosion shares — aggregates only, no household
  rows).
- `backend/build_district_climate.py` → `src/lib/district-climate.json` (district
  centre, NASA POWER, 2001–2020, plus the 2025 survey year).

The microdata, the training table and the trained models are **git-ignored**. They
are built locally and never committed, because the survey is confidential.

### Climate and forecast

- Climate is bundled (`district-climate.json`) so the app always has the district's
  normal figure without a network call.
- The forecast is fetched live from Open-Meteo (`WEATHER_FORECAST_URL`,
  `WEATHER_FORECAST_DAYS`, default 7). Each day carries its WMO weather code
  (clear sky `0` … thunderstorm with heavy hail `99`) and the hours rain is likely,
  so a farmer can plan a day, not only a week.
- A figure the farmer typed is **never overwritten** by a fetched one.

### Land use and boundaries

- District land-use CSVs are imported in the browser session only. Required columns:
  `district,crops_ha,pasture_ha,fallow_ha`. Shares use the sum of those three
  categories, never national totals, and missing districts stay unavailable.
- District boundaries are bundled with attribution (`rwanda-districts.json`,
  `district-geometry.ts`) for the map.

---

## 6. The models

Fitted on the survey; served by `backend/main.py` (`/predict`, `/meta`, `/stats`,
`/health`).

- Classifier: probability a crop succeeds, from **district + season + weather**.
  Held-out AUC ≈ 0.94.
- Regressor: expected yield in t/ha; held-out R² ≈ 0.81.
- The survey records **no soil type**, so the models are not trained on soil. Soil is
  used by the app's knowledge-based suitability engine instead — a separate path,
  clearly separated in `recommendation.ts` and `recommendation-engine.ts`.
- Measured on a held-out fifth of the survey; 2025 was a dry year, so learned yields
  are from a dry year and the copy says so.
- If `VITE_API_URL` is unset or the service is down, the app falls back to the
  offline engine and labels the estimate as general guidance, not a live prediction.

---

## 7. AI assistance

All AI runs against an **OpenAI-compatible** backend. No provider is hardcoded and no
credential is ever in the browser.

| Variable             | Meaning                                                   |
| -------------------- | --------------------------------------------------------- |
| `AI_API_KEY`         | key (falls back to `OPENAI_API_KEY`)                      |
| `AI_BASE_URL`        | e.g. `https://api.openai.com/v1`; any compatible endpoint |
| `AI_MODEL`           | model name to request                                     |
| `AI_PROVIDER`        | `openai` (default) or `vercel-gateway`                    |
| `AI_GATEWAY_API_KEY` | gateway key (falls back to Vercel's OIDC token)           |

Speech is a **separate** OpenAI-compatible endpoint behind the same server gateway:

| Variable              | Meaning                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `AI_SPEECH_BASE_URL`  | speech endpoint (falls back to `AI_BASE_URL`)                         |
| `AI_SPEECH_API_KEY`   | speech key (falls back to `AI_API_KEY`)                               |
| `AI_STT_MODEL`        | transcription model                                                   |
| `AI_TTS_MODEL`        | spoken-answer model                                                   |
| `AI_TTS_VOICE`        | voice (choosing the voice chooses the language)                       |
| `AI_TTS_FORMAT`       | audio format the model accepts                                        |
| `AI_TTS_MAX_CHARS`    | max characters per clip; longer answers are split and played in order |
| `AI_SPEECH_LANGUAGES` | the languages the backend can actually read aloud                     |

Speech rules, all deliberate:

- The request carries **only** the standard OpenAI speech fields (`model`, `voice`,
  `input`, `response_format`). A strict endpoint rejects anything else.
- The server reports which farmer languages the backend can speak. A language it
  cannot read is offered as **writing only** rather than spoken badly, and the server
  refuses to speak it.
- A backend that cannot serve speech at all (plan, terms, auth) is **not shown as an
  error**. The panel says so calmly, stops offering the spoken button for the visit,
  and reports the refusal reason to whoever runs the deployment.
- The panel only shows problems a farmer can act on, such as a blocked microphone. A
  request that simply fails is left unanswered rather than shown as an error.

Deterministic guidance is always visible when AI is unavailable, so the app is useful
with no key at all.

### The digest

Assistants are grounded, not chatty:

- The farmer assistant answers agronomic questions in the farmer's language, sending
  only the most recent turns to the server.
- The season assistant is a single form-driven explanation with no conversation
  history.
- The agronomist assistant answers from a digest the server builds from the published
  survey figures, the model report and the district climate, and is told to quote no
  other number and to name a figure that is missing.
- The written plan may only quote figures its digest holds; a rate, spacing or price
  the model adds is dropped before the farmer sees it.

---

## 8. Languages

Farmer languages are `en`, `rw`, `fr` (`FarmerLanguage` in
`farmer-language.ts`). All copy that a farmer reads lives in shared, browser-safe
catalogs so the UI and the AI advice always speak the same language:

- `farmer-language.ts` — labels, crop names, soil names, seasons, days
- `recommendation-copy.ts`, `advice.ts`, `guidance.ts`, `plan-summary.ts`
- `insurance-language.ts` / `insurance-coverage.ts` (insurance copy and stable
  coverage IDs, so a language change keeps the farmer's choices)
- `season-guide.ts`, `weather.ts` (WMO descriptions, rain windows)

Kinyarwanda input names are spelled out rather than borrowed: Manure → _Ifumbire
y'amatungo_, Compost → _Ifumbire y'ibimera_, Green manure → _Ifumbire y'ibimera
bigerwa_, Chaux → _Ibunyanga_.

---

## 9. Design system

One system, three layers, all in `src/styles.css`:

1. **Tokens** — brand palette, surfaces, status colours (success, warning, info,
   danger), borders and elevation, each with a light and a dark value in `oklch`.
2. **Components** — `.panel`, `.callout`, `.status-pill`, `.stat`, `.field`,
   `.option-card`, `.chip`, `.result-card`.
3. **Layout** — `.page`, `.page-header`, `.page-title`, `.page-lede`, `.page-section`.

Every farmer-facing block is a labelled panel (`<section aria-labelledby>`) built from
the primitives in `src/components/ui`, so each topic is a landmark a screen reader can
jump to. A status colour or surface never comes from an ad-hoc utility inside a
component.

Icons are consistent (lucide) and distinct per block, so a panel is recognisable by
its mark: season = calendar, plan = checklist, question box = question mark, field =
sprout, insurance = shield, agronomist = chart, summary = bell.

Responsiveness is part of the system, verified at 360 px, 768 px and 1440 px on all
four pages: no horizontal overflow, grids stack, the header keeps its two lines, and
the summary panel scrolls internally.

---

## 10. File map

```
public/logo.svg                 the brand mark used in the header
public/favicon.svg              the tab icon
src/routes/__root.tsx           shell, head/meta, FieldProvider, SiteShell
src/routes/index.tsx            Farmer page
src/routes/advice.tsx           Advice page
src/routes/guidance.tsx         Guidance route (renders GuidancePage)
src/routes/dashboard.tsx        Agronomist page
src/components/SiteShell.tsx    two-line header, nav, footer
src/components/PlanSummaryMenu.tsx   the bell + summary panel + notification
src/components/PlanSummaryBody.tsx   summary body (crops, inputs, insurance, advice)
src/components/GuidancePage.tsx      the help desk and its four modes
src/components/{SeasonAssistant,FarmerAssistant,VoiceAssistant,CropRecommendation,
                InsuranceGuidance,AgronomistAssistant,DistrictWeatherCard,
                DistrictLandMap,AhsPrevalence,ThemeToggle}.tsx
src/lib/field.ts, field-context.tsx  the farmer's field, shared and persisted
src/lib/plan-summary.ts              buildPlanSummary + EN/RW/FR copy
src/lib/recommendation.ts, recommendation-engine.ts, crop-knowledge.ts
src/lib/advice.ts, district-inputs.json
src/lib/weather.ts, weather.server.ts, weather.functions.ts
src/lib/district-climate.json, district-centroids.json, district-geometry.ts
src/lib/ai/{chat,speech,audio}.server.ts, speech.ts, error-codes.ts
src/lib/grounding.ts                 drops invented figures
src/hooks/use-district-weather.ts, use-auto-prediction.ts, use-voice.ts, use-theme.ts
backend/{prepare_training_data,ml_pipeline,build_district_inputs,
         build_district_climate,data_processor,main}.py, Dockerfile
scripts/test-app-ai-e2e.mjs          app-level end-to-end check (server functions)
scripts/test-voice-e2e.ps1           speech round trip against the local stack
scripts/start-local-voice.ps1        free local speech server
scripts/make-speech-sample.mjs       regenerates scripts/fixtures/speech-sample.wav
src/test/*.test.{ts,tsx}             139 tests over 26 files
```

---

## 11. Run it locally

```bash
cp .env.example .env      # set VITE_API_URL and any AI keys
npm install
npm run dev               # http://localhost:5173
```

Optional, if you want the trained models:

```bash
cd backend
pip install -r requirements.txt
python prepare_training_data.py --microdata "C:/path/to/Microdata"
python ml_pipeline.py                # trains and writes models/
uvicorn main:app --reload --port 8000
```

Without `VITE_API_URL`, the app uses the offline engine and says the prediction server
is not connected. Without AI keys, the deterministic guidance stays and the
assistants report that they are not configured.

Preview a production build with:

```bash
npm run build
node .output/server/index.mjs        # Nitro output — not `vite preview`
```

Restart the dev server after editing `.env`: server-side variables are read when the
server starts.

---

## 12. Tests and verification

```bash
npx tsc --noEmit          # types
npm run lint              # eslint
npm test                  # 139 tests, 26 files
npm run build             # production build
node scripts/test-app-ai-e2e.mjs          # against a dev server
$env:APP_URL="https://imbutosmart.vercel.app"; node scripts/test-app-ai-e2e.mjs
```

The app-level check exercises the same server functions the browser calls (farmer
Q&A, season advice, plan, speech round trip), so it proves prompting, validation and
error handling — not just that the endpoints answer. It checks the spoken path in
both directions: an answer is read aloud when the backend can speak, and the recorded
sample in `scripts/fixtures/speech-sample.wav` is transcribed and answered even when
it cannot, so a deployment that is silent still proves the farmer's recording works.

Notes:

- Every component that uses the shared field must be wrapped in `FieldProvider` in
  tests (`guidance.test.tsx`, `plan-summary-menu.test.tsx`).
- Route components that need tests are exported from `src/components` (Guidance) so
  route files stay code-split.
- The recurring hydration warning in local dev is Kaspersky-injected script vs. the
  theme script — a browser-extension artifact, not an app bug.

---

## 13. Deployment

### Web app — Vercel

- Project: `manziemile1-5955s-projects/imbutosmart`; production URL
  `https://imbutosmart.vercel.app`; root `vercel.json` (`npm run build`, `npm install`,
  `framework: null` because Nitro builds the output).
- Deploy with `npx vercel deploy --prod --yes` (or push to `origin main`).
- Environment variables are set on the host as secrets; `VITE_*` values are inlined
  at build time, everything else stays server-side.
- After a deploy, verify: `APP_URL=https://imbutosmart.vercel.app node
scripts/test-app-ai-e2e.mjs`. The alias can lag the new deployment for a few
  seconds, so retry once before assuming a failure.

### Prediction service — Render

- Root `render.yaml` (Docker, `./backend`, health check `/health`), or a Docker web
  service with root directory `backend`.
- Build the artifacts privately first: `prepare_training_data.py` and
  `ml_pipeline.py`. Without them `/health` answers but `/predict`, `/meta` and
  `/stats` return 503. `/stats` also needs the training table.
- Verify `/meta` and a real `/predict`, then set `VITE_API_URL` to the service URL.
- Set `ALLOWED_ORIGINS` to the origin(s) that serve the frontend.

### Environment variables at a glance

| Group           | Variables                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App             | `VITE_API_URL`                                                                                                                                                                   |
| Chat            | `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_PROVIDER`, `AI_GATEWAY_API_KEY`                                                                                                     |
| Speech          | `AI_SPEECH_BASE_URL`, `AI_SPEECH_API_KEY`, `AI_STT_MODEL`, `AI_TTS_MODEL`, `AI_TTS_VOICE`, `AI_TTS_FORMAT`, `AI_TTS_MAX_CHARS`, `AI_SPEECH_LANGUAGES`                            |
| Weather         | `WEATHER_FORECAST_URL`, `WEATHER_FORECAST_DAYS`                                                                                                                                  |
| Auth (optional) | `SUPABASE_URL`, `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

A deployment with none of these set still serves the app: deterministic advice, the
offline crop engine, the bundled climate, and clear messages where a service is
missing.

---

## 14. Deliberately unavailable

These are missing on purpose, not by accident:

- A district's measured rain or temperature when no published record covers it.
  The app leaves the figure out rather than estimating it from national totals.
- A fertiliser rate with fewer than five survey observations behind it.
- Soil type in the trained model (the survey does not record it).
- Risk scores, eligibility, premiums or insurer rankings for insurance.
- District land-use shares when the imported CSV omits that district.
- Spoken answers in a language the speech backend cannot read.

---

## 15. AI disclosure

AI assistants (Codex and similar tools) were used to architect the ML pipeline,
generate UI components and debug code. The data strategy, the NISR preprocessing
logic and the system design were implemented by the team.
