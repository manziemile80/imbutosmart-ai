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
cp .env.example .env           # set VITE_API_URL and any API keys
npm install && npm run dev
```

`.env` holds real API keys, so it is not committed. `.env.example` is the template: copy it and fill in the values you need. Every `AI_*` and `ELEVENLABS_*` variable is server-only and never reaches the browser.

## Deploy
- **Backend → Render.com:** Connect this repository in Render and create a Blueprint using the root `render.yaml`. Alternatively create a Docker Web Service with root directory `backend`. This workspace has no Render deployment connection; the Blueprint must be launched from your Render account. Render may charge for your chosen service plan.
- Before deployment, supply `backend/nisr_real_data.csv` with real district/crop/soil/weather/yield observations, or train privately and supply the four `backend/models/*.joblib` artifacts. Never commit confidential survey microdata to a public repository. Without these inputs `/health` can respond, but `/predict`, `/meta`, and `/stats` return 503: no trained model.
- `/stats` also needs the original CSV even when trained artifacts are supplied; artifacts alone support `/predict` and `/meta`, not historical yield comparisons.
- After deployment, verify `/meta` and a real `/predict` request (not just `/health`), then set the frontend `VITE_API_URL` to the HTTPS Render service address. `/stats` supplies held-out test accuracy and yield MAE in t/ha; historical comparison charts are in-sample, not test results.
- **Frontend:** set `VITE_API_URL` to the Render URL and publish to any static/edge host (such as Vercel, Netlify, or Render).
- **AI variables on the host:** the chat and speech backends are configured with server-only environment variables, so set them on the host rather than in the repository: `AI_BASE_URL`/`AI_MODEL` (or `AI_PROVIDER=vercel-gateway`), `AI_SPEECH_PROVIDER`, and the `ELEVENLABS_*` values. Keep them as secrets.
- **Verify the deployment:** `node scripts\test-app-ai-e2e.mjs` checks the deployed app's server functions the same way it checks a dev server, so a live deployment can be confirmed without a browser. Point it at the deployment with `APP_URL`.

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
```

`AI_SPEECH_BASE_URL` points voice at its own OpenAI-compatible backend, so speech keeps working even when chat uses a different provider; it falls back to `AI_BASE_URL` when unset. A dedicated speech URL with no key sends a harmless placeholder, so a local server that ignores auth needs no credential. Verify the whole loop with `powershell -ExecutionPolicy Bypass -File scripts\test-voice-e2e.ps1`.

`node scripts\test-app-ai-e2e.mjs` is the app-level check: it calls the server functions the browser calls (farmer Q&A, season advice, speech round trip), so it also covers request validation, prompting and error handling. It needs the dev server running (`npm run dev`).

`av<19` is required: faster-whisper 1.2.1 still passes `metadata_errors` to `av.open`, which PyAV 19 removed. Pin until faster-whisper ships the upstream fix.

### Voice with ElevenLabs
ElevenLabs has its own speech API, so it is selected by name and keeps its credential in its own variable. The chat backend is unaffected.

```
AI_SPEECH_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
ELEVENLABS_STT_MODEL=scribe_v2
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

- Speech-to-text uses `scribe_v2` and transcribes English and French well. Kinyarwanda is not in ElevenLabs' supported languages, so no language hint is sent for it and the model detects the language itself.
- Reading answers aloud needs a plan that includes the API: a free account can transcribe but is refused library voices, and a plan with credits (or a voice you created in the account) is needed for `text-to-speech`. When the backend refuses for that reason the app says so calmly and keeps the answer written out instead of showing an error.
- `ELEVENLABS_VOICE_ID` selects the voice. Run `node scripts\list-elevenlabs-voices.mjs` to see the voices the account can use (the key needs the `voices_read` permission).
- The server tells the page which of the app's languages the backend can actually speak, so a language it cannot read is offered as writing only rather than spoken badly.

Restart the dev server after changing `.env`: the server-side variables are read when the server starts, and a reload does not always pick them up.

## AI Disclosure
AI assistants (Codex) were used to architect the ML pipeline, generate UI components, and debug code. The core data strategy, NISR data preprocessing logic, and system design were implemented by the team.
