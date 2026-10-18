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
