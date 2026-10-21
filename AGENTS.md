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

- AI summaries stream from `src/routes/api/public/summarize.ts` (SSE, OpenRouter, key in `OPENROUTER_API_KEY`) — kept from the original app so output quality is unchanged.
- The main page loads client-only (`ClientOnly` + lazy import of `src/app/KonspektApp.tsx`) because pdf.js, KaTeX and the DOCX generator need the browser.
- Export produces DOCX in the browser with the `docx` package; LaTeX becomes native Word formulas (OMML) by walking KaTeX MathML output in `src/lib/mathml-to-docx.ts`. The old jsPDF/html2canvas PDF export was removed — do not reintroduce it.
- Prebundle React renderer/runtime entry points and the lazy lesson dialog together in Vite's client optimizer to prevent dependency discovery from mixing React generations in an open preview.
- The read-only lesson directory is bundled as structured JSON; resolve lesson numbers against that directory on both client and server so the original planning context remains authoritative without a database.
- Lesson selection uses a modal with seven fixed-height visible rows and recomputes proximity to the live Moscow calendar date each time it opens; this keeps date focus and neighboring lessons consistent across screens.
