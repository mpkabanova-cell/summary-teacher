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
- Every generation and refinement prepends the shared child-safety policy from `src/lib/server/child-safety.ts` before source and format instructions so uploaded content and formatting cannot override safety; this is prompt-level guidance, not an independent moderation service.
- The main page loads client-only (`ClientOnly` + lazy import of `src/app/KonspektApp.tsx`) because KaTeX and the DOCX generator need the browser.
- Export produces DOCX in the browser with the `docx` package; LaTeX becomes native Word formulas (OMML) by walking KaTeX MathML output in `src/lib/mathml-to-docx.ts`. The old jsPDF/html2canvas PDF export was removed — do not reintroduce it.
- Prebundle React renderer/runtime entry points and the lazy lesson dialog together in Vite's client optimizer to prevent dependency discovery from mixing React generations in an open preview.
- Lesson directories live per course in src/data/courses/<subject>-<grade>.json (server, full fields) plus a light src/data/course-index.json (client: number/title/section/concepts/dates) to keep the browser bundle small; courseId + lessonNumber are resolved on both sides.
- Lesson type is used only internally to pick the goal emphasis (src/lib/server/lesson-goal.ts) and is never printed.
- Lesson selection uses a dropdown with seven fixed-height visible rows and recomputes proximity to the live Moscow calendar date each time it opens; this keeps date focus and neighboring lessons consistent across screens.

- The active generation flow is topic-only; client and API reject file-based generation. The kit is generated block by block (notes → algorithms → review → homework) in one SSE stream, each block receiving the previous ones as context; a single block can be regenerated with the other blocks passed as existingBlocks. Block prompts live in src/lib/server/prompt.ts (buildBlockSystemPrompt/buildBlockUserMessage); section splitting/assembly lives in src/lib/summary-types.ts.
- Detail, explanation style and wishes are edited only after a result and applied by full regeneration, not appended refinements, to avoid duplicate sections.
