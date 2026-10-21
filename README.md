# ImbutoSmart AI 🌱
NISR 2026 Big Data Hackathon

ImbutoSmart AI turns NISR agricultural survey data into planting advice. A Random Forest classifier estimates
the probability that a crop will succeed under a farmer's district, soil and forecast weather, and a
Random Forest regressor estimates expected yield (t/ha). Crops are ranked by expected value.

**NST2 alignment:** supports the National Strategy for Transformation pillar on agricultural productivity —
raising yields per hectare, climate-resilient crop choice, and data-driven extension services.

## Structure
```
backend/   FastAPI + scikit-learn (data_processor.py, ml_pipeline.py, main.py, Dockerfile)
src/       Web app: Farmer Advisory (/) and Agronomist Dashboard (/dashboard)
```

## Design system
The interface is built from one system, in three layers, so every page looks like the same product.

1. **Tokens** (`src/styles.css`): brand palette, surfaces, status colours (success, warning, info, danger), borders and elevation, each with a light and a dark value in `oklch`.
2. **Components**: `.panel`, `.callout`, `.status-pill`, `.stat`, `.field`, `.option-card`, `.chip`, `.result-card`. Status colours are tokens, so a message reads the same in every language and in dark mode.
3. **Layout**: `.page`, `.page-header`, `.page-title`, `.page-lede`, `.page-section`.

The React primitives in `src/components/ui` (`Panel`, `Callout`, `StatusPill`, `Stat`) wrap those classes. Every farmer-facing block is a panel: a `<section>` with `aria-labelledby`, so each topic is a landmark a screen reader can jump to. Add new blocks with the primitives rather than ad-hoc colours or spacing.

## Run the backend
```bash
cd backend
pip install -r requirements.txt
python prepare_training_data.py --microdata "C:/path/to/Microdata"   # survey -> nisr_real_data.csv
python ml_pipeline.py          # trains + prints metrics, writes models/
uvicorn main:app --reload --port 8000
```

## The training data
The models are fitted on the **NISR Seasonal Agricultural Survey 2025** microdata (Seasons A, B and C), which records every crop a household planted: the district, the crop, the area, what was harvested and the sampling weight.

- `prepare_training_data.py` turns the extracted survey files into `backend/nisr_real_data.csv`: 51,225 crop observations over 30 districts, 12 crops and 3 seasons. Crops are mapped onto the crops the app offers (bush, climbing and French beans become beans; paddy rice becomes rice; cooking and dessert bananas become banana).
- The survey does not record soil type or the weather of the plot, so the training rows carry the **district's own climate** for that season: `build_district_climate.py` writes `backend/district_climate.json` from the published 2001–2020 record (NASA POWER, MERRA-2) at the centre of each district, plus the weather of the 2025 survey year itself.
- A crop that was planted and produced nothing is an unsuccessful planting. A crop that is normally harvested in a later round (cassava in Season A) contributes only the observations that were harvested, so a long cycle is not counted as a failure.
- The microdata and the trained models stay out of the repository: both are git-ignored and built locally.

The models work from the **district, the season and the weather**. The soil a farmer reports is used by the app's agronomic suitability engine, which is a separate, knowledge-based path. Measured on a held-out fifth of the survey: classifier AUC 0.94, yield regressor R² 0.81, and a per-crop yield error (maize 0.84 t/ha, beans 0.29 t/ha). 2025 was a below-average rainfall year, so the yields the model learned are from a dry year.

## District weather
The farmer page fills the rain and temperature from the selected district, so the figures follow the location instead of a fixed guess:

- the **climate** (what the district's rainfall and temperature usually are) from NASA POWER, and
- the **forecast** (what the coming days are expected to bring) from Open-Meteo, both fetched on the server and shown with their source.

A figure the farmer typed is never overwritten, and the endpoints can be changed with `WEATHER_CLIMATE_URL` and `WEATHER_FORECAST_URL`. When a source cannot be reached the page says so calmly and keeps the figures the farmer entered.

## Run the frontend
```bash
cp .env.example .env           # set VITE_API_URL and any API keys
npm install && npm run dev
```

`.env` holds real API keys, so it is not committed. `.env.example` is the template: copy it and fill in the values you need. Every `AI_*` and `ELEVENLABS_*` variable is server-only and never reaches the browser.

## Deploy
- **Backend → Render.com:** Connect this repository in Render and create a Blueprint using the root `render.yaml`. Alternatively create a Docker Web Service with root directory `backend`. This workspace has no Render deployment connection; the Blueprint must be launched from your Render account. Render may charge for your chosen service plan.
- Before deployment, build the training table and train privately: `python prepare_training_data.py --microdata <survey folder>` and `python ml_pipeline.py`, then supply the four `backend/models/*.joblib` artifacts to the service. The survey microdata and the training table are confidential and are git-ignored: never commit them. Without trained artifacts `/health` can respond, but `/predict`, `/meta`, and `/stats` return 503: no trained model.
- `/stats` also needs the original training table even when trained artifacts are supplied; artifacts alone support `/predict` and `/meta`, not historical yield comparisons.
- After deployment, verify `/meta` and a real `/predict` request (not just `/health`), then set the frontend `VITE_API_URL` to the HTTPS Render service address. `/stats` supplies held-out test accuracy, AUC and yield MAE in t/ha; historical comparison charts are in-sample, not test results.
- **Frontend:** set `VITE_API_URL` to the Render URL and publish to any static/edge host (such as Vercel, Netlify, or Render). The app is live at **https://imbutosmart.vercel.app**, which is the project this workspace deploys to (`npx vercel deploy --prod`). `abahinzismart.vercel.app` serves the same app from a separate Vercel project that this workspace cannot deploy to, so it can lag behind.
- **AI variables on the host:** the chat and speech backends are configured with server-only environment variables, so set them on the host rather than in the repository: `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` for chat, and `AI_SPEECH_BASE_URL`, `AI_STT_MODEL`, `AI_TTS_MODEL`, `AI_TTS_VOICE`, `AI_TTS_FORMAT`, `AI_TTS_MAX_CHARS` and `AI_SPEECH_LANGUAGES` for voice. Keep them as secrets.
- **Verify the deployment:** `node scripts\test-app-ai-e2e.mjs` checks the deployed app's server functions the same way it checks a dev server, so a live deployment can be confirmed without a browser. Point it at the deployment with `APP_URL`. It checks the spoken path in both directions: the answer is read aloud when the backend can speak, and a recorded sample (`scripts\fixtures\speech-sample.wav`) is transcribed and answered either way, so a deployment that cannot speak aloud still proves the farmer's recording works.

## District land-use map
The dashboard imports district aggregate CSVs in the current browser session; they are not uploaded to the prediction service and are not training data. Required columns: `district,crops_ha,pasture_ha,fallow_ha`. Values must be nonnegative hectares; missing districts remain unavailable. Shares use only the sum of those three categories, not all district land. Crop area must be a non-overlapping physical area, not the sum of crop areas that double-count intercropping. Only import aggregate, non-sensitive figures. The supplied national PDF is not sufficient to populate district shares.

## AI assistance
The farmer Q&A assistant and the season explanations call any **OpenAI-compatible** chat completions endpoint. Configure it with server-side environment variables:

- `AI_API_KEY` — API key for your provider (falls back to `OPENAI_API_KEY`).
- `AI_BASE_URL` — endpoint base URL, e.g. `https://api.openai.com/v1` (default). Point it at Azure OpenAI, Groq, OpenRouter, Ollama, or a self-hosted gateway.
- `AI_MODEL` — model name to request (default `gpt-4o-mini`).

These variables are server-only: the browser never sees the key, and every request is validated before it reaches the model. When no key is set, the assistant reports that it is not configured and the deterministic crop estimates and season guide stay available.

The chat backend is chosen by `AI_PROVIDER`:

- `openai` (default) — any OpenAI-compatible `/chat/completions` endpoint. `AI_BASE_URL` may be set on its own when the endpoint needs no auth.
- `vercel-gateway` — the Vercel AI Gateway, which addresses models as `provider/model` and authenticates a Vercel deployment with its own OIDC token, so no extra key is needed.

### Chat with Groq
Groq serves an OpenAI-compatible API with a free tier, so it is a good fit for the farmer assistants. Create a key at `console.groq.com/keys`, then set:

```
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-20b
AI_API_KEY=gsk_...
```

`openai/gpt-oss-20b` is fast, cheap and generous on the free plan (250K tokens per minute, 1K requests per minute). The Llama models moved to Enterprise plans, so they are no longer on the free tier.

### Running entirely free on one machine
Chat and voice can both run locally with no paid provider. Chat uses a local Ollama model; voice uses a separate self-hosted speech server.

```sh
# Chat (local LLM)
winget install --id Ollama.Ollama -e
ollama pull qwen2.5:3b            # ~2 GB, Q4_K_M, fits ~8 GB RAM on CPU

# Voice (local speech-to-text + text-to-speech)
python -m pip install --user "vocal-ai[kokoro]" "av<19"
winget install --id=Gyan.FFmpeg -e   # required for audio conversion
powershell -ExecutionPolicy Bypass -File scripts\start-local-voice.ps1
```

Then set in `.env`:

```
AI_API_KEY=ollama
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_MODEL=qwen2.5:3b

AI_SPEECH_BASE_URL=http://127.0.0.1:8000/v1
AI_STT_MODEL=Systran/faster-whisper-tiny
AI_TTS_MODEL=pyttsx3
AI_TTS_FORMAT=wav
AI_SPEECH_LANGUAGES=en
```

`AI_SPEECH_BASE_URL` points voice at its own OpenAI-compatible backend, so speech keeps working even when chat uses a different provider; it falls back to `AI_BASE_URL` when unset. A dedicated speech URL with no key sends a harmless placeholder, so a local server that ignores auth needs no credential. Verify the whole loop with `powershell -ExecutionPolicy Bypass -File scripts\test-voice-e2e.ps1`.

The local stack speaks with the voices installed on the machine, which is English only unless more are added, so `AI_SPEECH_LANGUAGES=en` is the honest declaration: Kinyarwanda and French answers stay written instead of being read aloud badly.

`node scripts\test-app-ai-e2e.mjs` is the app-level check: it calls the server functions the browser calls (farmer Q&A, season advice, speech round trip), so it also covers request validation, prompting and error handling. It needs the dev server running (`npm run dev`). The spoken sample it falls back to when the backend cannot speak is regenerated with `node scripts\make-speech-sample.mjs` while the local speech stack is running.

`av<19` is required: faster-whisper 1.2.1 still passes `metadata_errors` to `av.open`, which PyAV 19 removed. Pin until faster-whisper ships the upstream fix.

### Voice with Groq
Groq serves an OpenAI-compatible speech API, so the same key covers chat, transcription and spoken answers. Point the speech variables at it:

```
AI_SPEECH_BASE_URL=https://api.groq.com/openai/v1
AI_STT_MODEL=whisper-large-v3-turbo
AI_TTS_MODEL=canopylabs/orpheus-v1-english
AI_TTS_VOICE=hannah
AI_TTS_FORMAT=wav
AI_TTS_MAX_CHARS=200
AI_SPEECH_LANGUAGES=en
```

- **Transcription** uses `whisper-large-v3-turbo`, which is multilingual and handles the browser's webm/opus recording.
- **Spoken answers** use Orpheus, which only accepts `wav` and at most 200 characters per request, so the answer is split into clips that are played in order. `AI_TTS_MAX_CHARS` sets that limit and `AI_TTS_FORMAT` the audio format.
- Orpheus voices are `autumn`, `diana`, `hannah`, `austin`, `daniel` and `troy`.
- Groq's speech models speak **English only**, so `AI_SPEECH_LANGUAGES=en` is declared. The server tells the page which languages the backend can really speak, so Kinyarwanda and French answers are offered as writing rather than spoken badly.
- **Orpheus is gated.** It answers `model_terms_required` until the org admin accepts its terms at `https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english`, and the older `playai-tts` model has been decommissioned. Until the terms are accepted the page keeps every answer written and stops offering the spoken button; `scripts/test-app-ai-e2e.mjs` prints the refusal reason (`terms`, `plan`, `auth`, `model` or `request`) so the host can be fixed. The free local speech server above needs no account at all.

The speech request carries only the standard OpenAI speech fields (`model`, `voice`, `input`, `response_format`): a strict endpoint rejects anything else with `unknown field`, and the language is chosen by the voice the model is asked for.

Restart the dev server after changing `.env`: the server-side variables are read when the server starts, and a reload does not always pick them up.

## AI Disclosure
AI assistants (Codex) were used to architect the ML pipeline, generate UI components, and debug code. The core data strategy, NISR data preprocessing logic, and system design were implemented by the team.
