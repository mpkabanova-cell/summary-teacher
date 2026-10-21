/**
 * Fixes common AI LaTeX mistakes and normalizes $ delimiters for KaTeX.
 */

import { normalizeRussianQuotes } from "@/lib/russian-quotes";

const DISPLAY_HOLD = "\uE000DISPLAY";

function looksLikeMath(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return false;
  if (/[а-яА-ЯёЁ]/.test(t)) return false;
  if (/\\[a-zA-Z]+/.test(t)) return true;
  if (/[\^_]/.test(t)) return true;
  if (/\\frac|\\sqrt|\\left|\\right/.test(t)) return true;
  if (
    /[a-zA-Z0-9]/.test(t) &&
    /[=+\-*/·⋅]/.test(t) &&
    (/[\^_]/.test(t) || /\\/.test(t))
  ) {
    return true;
  }
  return false;
}

export function preprocessSummaryContent(content: string): string {
  let s = content;

  s = s.replace(/\bdota\b/g, "\\cdot");
  s = s.replace(/\\cdotp\b/g, "\\cdot");

  s = s.replace(/\\frac([a-zA-Z0-9])([a-zA-Z0-9])\b/g, "\\frac{$1}{$2}");
  s = s.replace(/\\sqrt([0-9a-zA-Z]+)\b/g, (_, x: string) => `\\sqrt{${x}}`);
  s = s.replace(/\\frackl\b/g, "\\frac{k}{l}");

  const displayBlocks: string[] = [];
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner: string) => {
    const idx = displayBlocks.length;
    displayBlocks.push(`$$${normalizeSlashFractionsInMath(inner.trim())}$$`);
    return `${DISPLAY_HOLD}${idx}\uE001`;
  });

  s = s.replace(/\$\$\$+/g, "$$");
  s = normalizeInlineMathFractions(s);
  s = healFragmentedInlineMath(s);
  s = wrapUndelimitedMath(s);
  s = healFragmentedInlineMath(s);
  s = normalizeInlineMathFractions(s);

  s = s.replace(
    new RegExp(`${DISPLAY_HOLD}(\\d+)\uE001`, "g"),
    (_, i) => displayBlocks[Number(i)] ?? "",
  );

  return normalizeRussianQuotes(s);
}

function normalizeInlineMathFractions(text: string): string {
  return text.replace(/\$([^$\n]+?)\$/g, (_, inner: string) => {
    return `$${normalizeSlashFractionsInMath(inner)}$`;
  });
}

function normalizeSlashFractionsInMath(tex: string): string {
  return tex.replace(
    /(?<!\\frac\{)\b([A-Za-z0-9]+)\/([A-Za-z0-9]+)\b/g,
    "\\frac{$1}{$2}",
  );
}

function healFragmentedInlineMath(s: string): string {
  let prev: string;
  do {
    prev = s;

    s = s.replace(
      /(?:^|[\s:—–-])([0-9a-zA-Z^_{}\\}()]+)\$\s*(\\[a-zA-Z]+)\s*\$([^$\n]+)\$\s*=\s*\$([^$\n]+)\$/gm,
      (m, a, op, b, c) =>
        m[0] === " " || m[0] === ":"
          ? `${m[0]}$${a} ${op} ${b} = ${c}$`
          : `$${a} ${op} ${b} = ${c}$`,
    );
    s = s.replace(
      /\$([^$\n]+)\$\s*(\\[a-zA-Z]+)\s*\$([^$\n]+)\$\s*=\s*\$([^$\n]+)\$/g,
      (_, a, op, b, c) => `$${a} ${op} ${b} = ${c}$`,
    );

    s = s.replace(
      /(?:^|[\s:—–-])([0-9a-zA-Z^_{}\\}()]+)\$\s*(\\[a-zA-Z]+)\s*\$([^$\n]+)\$/gm,
      (m, a, op, b) =>
        m[0] === " " || m[0] === ":"
          ? `${m[0]}$${a} ${op} ${b}$`
          : `$${a} ${op} ${b}$`,
    );
    s = s.replace(
      /\$([^$\n]+)\$\s*(\\[a-zA-Z]+)\s*\$([^$\n]+)\$/g,
      (_, a, op, b) => `$${a} ${op} ${b}$`,
    );

    s = s.replace(
      /\$([^$\n]+)\$\s*=\s*\$([^$\n]+)\$/g,
      (_, a, b) => `$${a.trim()} = ${b.trim()}$`,
    );
    s = s.replace(
      /\$([^$\n]+)\$\s*=\s*([0-9a-zA-Z^_{}\\}().]+)(?=[\s.,;:!?)\\]|$)/g,
      (_, a, b) => {
        if (!looksLikeMath(b)) return `$${a}$ = ${b}`;
        return `$${a.trim()} = ${b.trim()}$`;
      },
    );
  } while (s !== prev);
  return s;
}

function isInsideDollars(text: string, start: number): boolean {
  const before = text.slice(0, start);
  const dollarsBefore = (before.match(/(?<!\\)\$/g) ?? []).length;
  return dollarsBefore % 2 === 1;
}

function wrapUndelimitedMath(text: string): string {
  const patterns = [
    /\\frac\{[^{}]+\}\{[^{}]+\}/g,
    /\\sqrt\{[^{}]+\}/g,
    /\\left[([{][\s\S]*?\\right[\])}]/g,
    /\\[a-zA-Z]+\{[^{}]*\}(?:\{[^{}]*\})?/g,
    /[a-zA-Z0-9]+\^\{[^{}]+\}/g,
    /[a-zA-Z0-9]+\^[a-zA-Z0-9]+/g,
  ];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, (match, offset) => {
      if (isInsideDollars(result, offset)) return match;
      return `$${match}$`;
    });
  }
  return result;
}
