import { marked } from "marked";
import TurndownService from "turndown";
import katex from "katex";
import { preprocessSummaryContent } from "@/lib/math-preprocess";
marked.setOptions({ gfm: true, breaks: true });

export function renderLatexToHtml(
  latex: string,
  displayMode: boolean,
  opts?: { forPdf?: boolean },
): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      output: opts?.forPdf ? "html" : "htmlAndMathml",
    });
  } catch {
    if (opts?.forPdf) {
      return `<span class="katex-error">Формула не распознана</span>`;
    }
    return `<code>${latex}</code>`;
  }
}

/** Markdown → HTML for WYSIWYG editor (formulas as chips). */
export function markdownToEditorHtml(markdown: string): string {
  const processed = preprocessSummaryContent(markdown);

  let html = marked.parse(processed, { async: false }) as string;

  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
    const latex = tex.trim();
    const rendered = renderLatexToHtml(latex, true);
    return `<div class="math-formula math-display" contenteditable="false" data-latex="${escapeAttr(latex)}" data-display="true">${rendered}</div>`;
  });

  html = html.replace(/\$([^$\n]+?)\$/g, (_, tex: string) => {
    const latex = tex.trim();
    const rendered = renderLatexToHtml(latex, false);
    return `<span class="math-formula" contenteditable="false" data-latex="${escapeAttr(latex)}">${rendered}</span>`;
  });

  return html;
}

/** HTML from editor → markdown. */
export function editorHtmlToMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });

  td.addRule("mathDisplay", {
    filter: (node) =>
      node.nodeName === "DIV" &&
      (node as HTMLElement).classList.contains("math-formula"),
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const latex = el.getAttribute("data-latex") ?? "";
      return `\n\n$$${latex}$$\n\n`;
    },
  });

  td.addRule("mathInline", {
    filter: (node) =>
      node.nodeName === "SPAN" &&
      (node as HTMLElement).classList.contains("math-formula"),
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const latex = el.getAttribute("data-latex") ?? "";
      return `$${latex}$`;
    },
  });

  let md = td.turndown(html);
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

/** Markdown → HTML for PDF print (full KaTeX, no contenteditable). */
export async function markdownToPrintHtml(markdown: string): Promise<string> {
  const processed = preprocessSummaryContent(markdown);
  const body = renderMdChunk(processed, true);
  return `<div class="pdf-print-body" style="font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1a1a2e">${body}</div>`;
}

function renderMdChunk(md: string, forPdf = false): string {
  return markdownToViewHtml(md, { forPdf });
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

const CODE_PLACEHOLDER = "\uE000CODE";
const MATH_PLACEHOLDER = "\uE000MATH";

/** Markdown → HTML for on-screen view (KaTeX before marked, reliable for broken AI $). */
export function markdownToViewHtml(
  markdown: string,
  opts?: { forPdf?: boolean },
): string {
  let s = preprocessSummaryContent(markdown);
  const codeBlocks: string[] = [];
  const mathBlocks: string[] = [];

  s = s.replace(/```[\s\S]*?```/g, (block) => {
    codeBlocks.push(block);
    return `${CODE_PLACEHOLDER}${codeBlocks.length - 1}\uE001`;
  });

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
    const latex = tex.trim();
    const html = `<div class="katex-display my-4 overflow-x-auto">${renderLatexToHtml(latex, true, opts)}</div>`;
    mathBlocks.push(html);
    return `${MATH_PLACEHOLDER}${mathBlocks.length - 1}\uE001`;
  });

  s = s.replace(/\$([^$\n]+?)\$/g, (_, tex: string) => {
    const latex = tex.trim();
    if (!latex) return "$$";
    const html = renderLatexToHtml(latex, false, opts);
    mathBlocks.push(html);
    return `${MATH_PLACEHOLDER}${mathBlocks.length - 1}\uE001`;
  });

  let html = marked.parse(s, { async: false }) as string;

  html = html.replace(
    new RegExp(`${MATH_PLACEHOLDER}(\\d+)\uE001`, "g"),
    (_, i) => mathBlocks[Number(i)] ?? "",
  );
  html = html.replace(
    new RegExp(`${CODE_PLACEHOLDER}(\\d+)\uE001`, "g"),
    (_, i) => {
      const block = codeBlocks[Number(i)] ?? "";
      const inner = block.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return `<pre><code>${escapeAttr(inner)}</code></pre>`;
    },
  );

  return html;
}
