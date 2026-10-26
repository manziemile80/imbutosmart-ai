# ImbutoSmart AI — System Documentation

ImbutoSmart AI is a farmer-facing crop and field planning app for Rwanda. It
turns published district figures, the season and the weather into a short plan a
farmer can act on, in English, Kinyarwanda or French.

## What the app does

The farmer chooses a district, a soil type and a season once. From that field the
app estimates the crops that suit it, shows the inputs farmers in that district
actually apply and how much, explains the insurance worth asking about, and
offers a written plan and several ways to ask follow-up questions. The full
overview can be read on one page and downloaded as a PDF.

Every figure is traceable: it comes from the NISR Seasonal Agricultural Survey
2025, the district's published climate record or the crop knowledge base. The app
does not invent prices, risk scores, premiums or missing measurements.

## The farmer's field

District, soil and season belong to the app, not to a page. The Farmer page is
the only menu that writes them; every other page reads the same field and points
back to the Farmer page with a short link. The field is kept in the browser for
the next visit, and the language is chosen once in the header and shared the
same way.

## The five pages

- **Farmer (`/`)** — the field controls, the crop estimate for that field and
  the insurance guidance. This is the only page that sets the field.
- **Advice (`/advice`)** — the crops for the field, the inputs farmers there
  use with their application rate, the season's rain and the days ahead, the
  written plan, and the assistance panel.
- **Guidance (`/guidance`)** — the help desk. Every assistant is reachable here
  in plain words: ask a question, speak a question, explain the season, or ask
  the agronomist about the plan. No other menu repeats an assistant.
- **Summary get (`/summary`)** — the whole summary in one place: crops, inputs
  with rates, insurance and what else to do. One action: download it as a PDF.
- **Dashboard (`/dashboard`)** — the agronomist view, with the district map, the
  model report and the session-local land-use import.

## Data and figures

- **Crops** — the suitability engine combines the district, the soil, the season
  and the district's climate.
- **Inputs** — the share of survey segments using each input and the rate it was
  applied at, in kilograms per hectare, from the NISR Seasonal Agricultural
  Survey 2025. Only district aggregates are used; household records never enter
  the app.
- **Season and weather** — the district's published rainfall and temperature
  records, plus the coming days' forecast. A figure the farmer types is never
  overwritten by a fetched one, and the app never estimates a district's climate.
- **Insurance** — a multilingual catalog of official programme information. It
  gives context from the district and soil, never a risk score, eligibility
  decision, premium or insurer ranking, and it asks the farmer to confirm the
  policy.
- **Land use** — the dashboard imports aggregate district CSVs in the browser
  session only. Missing districts stay unavailable rather than being inferred
  from national totals.

## AI assistance and voice

All AI runs against any OpenAI-compatible backend configured on the server with
`AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL`. The browser never sees a credential
and no provider is hardcoded. Speech uses the same pattern through
`AI_SPEECH_BASE_URL`, behind the server gateway.

The assistants answer from a digest of the figures the dashboard shows. A plan
may only quote figures its digest holds: a rate, spacing or price the model adds
is dropped before the farmer sees it. When AI is unavailable, the deterministic
reference guidance stays visible instead of an error.

## The downloadable summary

Summary get writes the whole summary as a PDF named for the field, for example
`imbutosmart-summary-musanze-season-a.pdf`. The file carries every section the
page shows, so a downloaded plan is never a shortened preview. The PDF is
written in the app with the standard Helvetica faces: no PDF dependency, no
network call, and it opens on a phone or a printer. The page has no share sheet
and no email form.

## Announcements

The header bell is an announcement feed, not a second copy of a page. It carries
three short notices: the Guidance help desk, the cost of manure (with no price of
its own, because the app holds none) and a reminder to check the season before
planting. Each notice links to the page that holds the detail. The bell never
repeats summary figures and never announces that a summary is ready.

## Languages and accessibility

The interface and the guidance are available in English, Kinyarwanda and French.
One language selector in the header changes every page, and the choice is kept
for the next visit. Farmer-facing blocks are labelled panels built from the
shared primitives, so each topic is a landmark a screen reader can jump to. The
speech backend reports which languages it can read aloud; a language it cannot
speak is offered as writing only.

## Running the app

```bash
npm install
npm run dev
```

Set `VITE_API_URL` for the prediction backend. The AI and speech features need
the server-only `AI_*` variables described in the root `README.md`. Without them
the app runs, the deterministic guidance stays available and the summary is
still downloadable.

## Deployment

The frontend is published from this workspace to Vercel. The prediction backend
is a separate service deployed from the root Blueprint on Render, with the
backend Docker context. Verify the model-dependent endpoints, not only the health
endpoint, before treating a deployment as prediction-ready. The free local AI
and speech stack can be checked through the app's own server functions with
`scripts/test-app-ai-e2e.mjs`.

## Demo walkthrough

The video walkthrough is stored in `demo/video/` and is described here.

1. Farmer page: choose district, soil and season.
2. Advice: crops, inputs and rates, season rain, written plan.
3. Guidance: a question, the season explanation, the voice panel, the agronomist.
4. Summary get: read the summary, download the PDF, open it.
5. Header bell: the three announcements.
6. Dashboard: the agronomist view and the district map.

## Limitations and honest gaps

- The app holds no input prices. Manure and fertiliser prices change by shop and
  season, so the farmer is told to ask their agrodealer.
- District climate comes from published records; the app does not estimate it.
- Some districts lack land-use aggregates, so those measurements stay
  unavailable.
- A speech backend may be unable to read answers aloud, for example when its
  plan or terms do not cover speech. The answer then stays written and the page
  says so calmly.
- The survey microdata, the training table and the trained models stay out of
  the repository.

## NISR guidance alignment

The NISR 2026 project overview is now the repository `README.md`. It records the
problem, the six core features, the Random Forest classifier and regressor, the
held-out evaluation (AUC 0.94, yield R² 0.81), the data sources (NISR survey,
NASA POWER / MERRA-2 climate, Open-Meteo forecast), privacy rules and the NST2
alignment. This documentation follows the same figures; where a section differs,
`README.md` is the reference.
