const CODE_FENCE_RE = /```[\s\S]*?```/g;
const MATH_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g;

export function normalizeRussianQuotes(text: string): string {
  return preserveByRegex(text, CODE_FENCE_RE, normalizeRussianQuotesInProse);
}

export function normalizeRussianQuotesInProse(text: string): string {
  return preserveByRegex(text, MATH_RE, typographQuotePairs);
}

function preserveByRegex(
  text: string,
  regex: RegExp,
  transform: (chunk: string) => string,
): string {
  let result = "";
  let last = 0;
  let match: RegExpExecArray | null;

  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    result += transform(text.slice(last, match.index));
    result += match[0];
    last = match.index + match[0].length;
  }

  result += transform(text.slice(last));
  return result;
}

function typographQuotePairs(text: string): string {
  return text
    .replace(/“([^”\n]+)”/g, "«$1»")
    .replace(/‘([^’\n]+)’/g, "«$1»")
    .replace(/"([^"\n]+)"/g, "«$1»")
    .replace(/'([^'\n]+)'/g, "«$1»");
}
