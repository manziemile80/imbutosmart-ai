# Demo folder

Everything used to present ImbutoSmart AI: the walkthrough video, optional
stills, and the written documentation that is delivered as a PDF.

## What lives here

| Path                     | What it holds                                                        |
| ------------------------ | -------------------------------------------------------------------- |
| `video/`                 | The recorded walkthrough, named `imbutosmart-demo.mp4`.               |
| `screenshots/`           | Optional stills used in the documentation or the video thumbnail.     |
| `documentation.md`       | The source description of the app; edit this, not the PDF.            |
| `documentations.pdf`     | The description as a PDF, generated from `documentation.md`.          |
| `README.md`              | This guide: how to run, record and rebuild the documentation.         |

## Run the app for the demo

```bash
npm install
npm run dev
```

Set `VITE_API_URL` in `.env` for the prediction backend. The AI and speech
features also need the server-only `AI_*` variables described in the root
`README.md`; without them the app still runs and the deterministic guidance
stays available.

## Suggested walkthrough

Keep it to about five minutes and follow one farmer's field the whole way.

1. **Farmer page (`/`)** — choose the district, soil and season. Say that this
   is the only page that sets the field.
2. **Advice (`/advice`)** — show the crops for that field, the inputs farmers
   there apply with the survey's rate, the season's rain and the days ahead,
   and the written plan.
3. **Guidance (`/guidance`)** — ask a question in plain words, show the season
   explanation, the voice panel and the agronomist. Switch language once in the
   header and show the same field in Kinyarwanda or French.
4. **Summary get (`/summary`)** — read the whole summary, then download it as a
   PDF and open the file to show that every section is there.
5. **Header bell** — show the announcements: the Guidance help desk, the cost of
   manure, and the reminder to check the season. Point out that no figures and
   no summary live in the bell.
6. **Dashboard (`/dashboard`)** — briefly show the agronomist view, the district
   map and the land-use import.

## Add the video

Put the recording at `demo/video/imbutosmart-demo.mp4`. If it is delivered
through a share link instead, add the link to `documentation.md` under
"Demo walkthrough".

## Rebuild the PDF

Edit `demo/documentation.md`, then run:

```bash
node scripts/build-demo-pdf.mjs
```

The script writes `demo/documentations.pdf` with the same dependency-free PDF
writer the app uses for the farmer's summary.

## What must not be committed

The NISR survey microdata, the training table, the trained models and any real
API keys stay out of the repository. The demo shows the app, the published
district aggregates and the documentation only.
