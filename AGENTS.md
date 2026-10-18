<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep season reference data and validation in a shared browser-safe module; AI explanations live in a server function with server-only gateway helpers so credentials never enter the browser.
- Season assistance is a single form-driven explanation without conversation history; deterministic reference guidance remains available when AI is unavailable.
- Keep farmer translations in a shared browser-safe catalog and pass a validated language code to season explanations, so UI and AI advice use the same language without changing model selection.
- Automatic crop requests are debounced and discard superseded responses; preserve entered weather values and do not fabricate district climate data.
- Keep district land-use parsing and share calculations browser-safe and separate from crop training; imports are session-local aggregates so survey observations are not confused with physical land allocations.
- Render deployment uses the root Blueprint and the backend Docker context; verify model-dependent endpoints before considering a healthy service prediction-ready.
- Bundle openly licensed district boundaries with attribution; missing district measurements stay unavailable rather than being inferred from national totals.
