const PREAMBLE_LINE_RE =
  /^\s*(?:#{1,6}\s*)?(?:конечно|хорошо|готово|вот|ниже|давайте|давай|привет|здравствуйте|я\s+подготовил[аи]?|я\s+составил[аи]?)[^.!?\n]{0,160}[.!?:]?\s*/i;

import type { SummaryFormat } from "@/lib/summary-types";

export function removeModelPreamble(markdown: string): string {
  return markdown
    .split(/(\n{2,}---\n{2,})/)
    .map((part) => (part.includes("---") ? part : cleanupSection(part)))
    .join("");
}

export function cleanSummaryContent(
  markdown: string,
  format?: SummaryFormat,
): string {
  const base = removeMermaidAndDiagrams(removeModelPreamble(markdown));
  if (format === "qa") return cleanupQuestionsOnly(base);
  return base;
}

/** Удаляет блоки Mermaid/flowchart (рендер схем отключён). */
export function removeMermaidAndDiagrams(markdown: string): string {
  let result = markdown;

  result = result.replace(/```(?:mermaid|flowchart)\s*[\s\S]*?```/gi, "");
  result = result.replace(/```(?:mermaid|flowchart)[\s\S]*$/gi, "");
  result = result.replace(
    /(?:^|\n)```?\s*flowchart\s+\w+[\s\S]*?(?=\n#{1,6}\s|\n\n\n|$)/gi,
    "\n",
  );

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

/** Режим «Вопросы»: оставляет только заголовок и нумерованный список вопросов. */
export function cleanupQuestionsOnly(markdown: string): string {
  const stripped = stripQaForbiddenBlocks(markdown);
  const questions = extractQuestions(stripped);
  if (questions.length === 0) {
    return "";
  }

  const title = buildQaTitle(stripped);
  const lines = [title, ""];

  questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${question}`);
  });

  return `${lines.join("\n")}\n`;
}

function cleanupSection(text: string): string {
  let result = text.replace(/^\uFEFF/, "");
  result = removeLeadingPreamble(result);
  result = removeTrailingOutro(result);
  return result;
}

function removeLeadingPreamble(text: string): string {
  let result = text;
  let previous: string;

  do {
    previous = result;
    result = result.replace(PREAMBLE_LINE_RE, "");
    result = result.replace(/^\s*\n+/, "");

    const stripped = stripEdgeBlock(result, "start");
    if (stripped !== result) result = stripped;
  } while (result !== previous);

  return result;
}

function removeTrailingOutro(text: string): string {
  let result = text;
  let previous: string;

  do {
    previous = result;
    result = result.replace(/\s*\n+$/, "");

    const stripped = stripEdgeBlock(result, "end");
    if (stripped !== result) result = stripped;
  } while (result !== previous);

  return result;
}

function stripEdgeBlock(text: string, edge: "start" | "end"): string {
  const parts = text.split(/\n\n+/);
  if (parts.length < 2) {
    if (edge === "start" && isIntroBlock(text)) return "";
    if (edge === "end" && isOutroBlock(text)) return "";
    return text;
  }

  if (edge === "start" && isIntroBlock(parts[0])) {
    return parts.slice(1).join("\n\n");
  }

  if (edge === "end" && isOutroBlock(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("\n\n");
  }

  return text;
}

function isIntroBlock(block: string): boolean {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  if (lines.some(isStructuralLine)) return false;
  return lines.every(isConversationalIntroLine);
}

function isOutroBlock(block: string): boolean {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  if (lines.some(isStructuralLine)) return false;
  return lines.every(isConversationalOutroLine);
}

function isStructuralLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return (
    /^#{1,6}\s/.test(trimmed) ||
    /^[-*+]\s/.test(trimmed) ||
    /^\d+\.\s/.test(trimmed) ||
    /^\|/.test(trimmed) ||
    /^```/.test(trimmed) ||
    /\$\$/.test(trimmed) ||
    /^\$[^$]/.test(trimmed)
  );
}

function isConversationalIntroLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || isStructuralLine(trimmed)) return false;
  if (PREAMBLE_LINE_RE.test(trimmed)) return true;

  const lower = trimmed.toLocaleLowerCase("ru-RU");
  if (/^(?:привет|здравствуй|добрый\s+день)/i.test(lower)) return true;
  if (/давай(?:те)?\s+(?:разбер|посмотрим|изучим|начн)/i.test(lower)) return true;
  if (/это\s+важная\s+тема/i.test(lower)) return true;
  if (/поможет\s+тебе\s+(?:лучше\s+)?(?:понять|разобраться|решать)/i.test(lower)) return true;
  if (/в\s+математике,\s+которая\s+поможет/i.test(lower)) return true;
  if (/в\s+этом\s+(?:конспекте|материале)\s+мы/i.test(lower)) return true;

  return trimmed.length < 320 && /(?:разберёмся|разберемся).*(?:тема|материал)/i.test(lower);
}

function isConversationalOutroLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || isStructuralLine(trimmed)) return false;

  const lower = trimmed.toLocaleLowerCase("ru-RU");
  if (/^надеюсь[,\s]/i.test(lower)) return true;
  if (/удачи\s+в\s+уч/i.test(lower)) return true;
  if (/успехов\s+в\s+(?:изучении|уч)/i.test(lower)) return true;
  if (/если\s+остались\s+вопросы/i.test(lower)) return true;
  if (/было\s+приятно\s+помочь/i.test(lower)) return true;
  if (/рад(?:а)?\s+(?:был|была)\s+помочь/i.test(lower)) return true;

  return (
    trimmed.length < 320 &&
    /надеюсь.*(?:поможет|понять|разобраться)/i.test(lower)
  );
}

const QA_ANSWER_BLOCK_RE =
  /(?:\*\*)?(?:Ответ|Пример|Решение|Пояснение|Комментарий):(?:\*\*)?[\s\S]*?(?=\n\s*(?:\*\*)?(?:Вопрос|Ответ|Пример|Решение):|\n#{1,6}\s|\n---|\n###\s+Карточка|\n##\s+|$)/gi;

const QA_QUESTION_LABEL_RE =
  /(?:\*\*)?Вопрос:(?:\*\*)?\s*([\s\S]*?)(?=\n\s*(?:\*\*)?(?:Ответ|Пример|Решение):|\n#{1,6}\s|\n---|\n###\s+|\n##\s+|$)/gi;

function stripQaForbiddenBlocks(markdown: string): string {
  let result = removeMermaidAndDiagrams(markdown);

  result = result.replace(QA_ANSWER_BLOCK_RE, "");
  result = result.replace(
    /(?:^|\n)(?:\*\*)?Ответ:(?:\*\*)?[^\n]*/gi,
    "\n",
  );
  result = result
    .split(/\n(?=#{1,6}\s)/)
    .filter((section) => !isTheorySection(section))
    .join("\n");

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function isTheorySection(section: string): boolean {
  const heading = section.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? "";
  const lower = heading
    .replace(/\*+/g, "")
    .trim()
    .toLocaleLowerCase("ru-RU");

  if (!lower) return false;
  if (/вопрос|самопроверк|карточк/i.test(lower)) return false;

  return /теория|в двух словах|определени|конспект|шпаргалк|основные понятия|основные свойства|кратко о теме|схема|диаграмм|примеры и применение/i.test(
    lower,
  );
}

function extractQuestions(markdown: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    let question = normalizeQuestionText(raw);
    if (question.length < 8) return;

    if (isFillInBlankQuestion(question)) {
      const rewritten = rewriteFillInBlankQuestion(question);
      if (!rewritten) return;
      question = rewritten;
    }

    if (!question.includes("?")) {
      question = `${question.replace(/[.!]+$/g, "")}?`;
    }

    const key = normalizeQuestionKey(question);
    if (seen.has(key)) return;
    seen.add(key);
    found.push(question);
  };

  extractFromTable(markdown, add);

  for (const match of markdown.matchAll(QA_QUESTION_LABEL_RE)) {
    add(match[1]);
  }

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    const numbered = /^\d+\.\s+(.+)$/.exec(trimmed);
    const bullet = /^[-*+]\s+(.+)$/.exec(trimmed);
    const text = (numbered?.[1] ?? bullet?.[1] ?? "").trim();
    if (!text) continue;
    if (isLikelyQuestion(text)) add(text);
  }

  return found;
}

function extractFromTable(
  markdown: string,
  add: (question: string) => void,
): void {
  const lines = markdown.split("\n");
  let questionCol = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;

    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
      continue;
    }

    if (questionCol < 0 && /вопрос/i.test(trimmed)) {
      questionCol = cells.findIndex((cell) => /вопрос/i.test(cell));
      continue;
    }

    if (questionCol < 0) continue;

    const question = cells[questionCol];
    if (!question || /^(№|вопрос)$/i.test(question)) continue;
    if (/^ответ$/i.test(question)) continue;
    add(question);
  }
}

function isLikelyQuestion(text: string): boolean {
  if (/(?:\*\*)?(?:Ответ|Пример|Решение):/i.test(text)) return false;
  if (isFillInBlankQuestion(text)) return true;
  return (
    text.includes("?") ||
    /^(?:как|что|какое|какая|каков|почему|зачем|когда|где|кто|назов|перечисл|вычисл|определи|сформулируй|дайте|дай)\b/i.test(
      text,
    )
  );
}

function normalizeQuestionText(raw: string): string {
  return raw
    .replace(/^\s*(?:\*\*)?Вопрос:(?:\*\*)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestionKey(question: string): string {
  return question
    .toLocaleLowerCase("ru-RU")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(?:какое|какой|какая|какие|что|как|почему|зачем|чему|равно)\b/giu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isFillInBlankQuestion(text: string): boolean {
  const lower = text.toLocaleLowerCase("ru-RU");
  return (
    /заполните\s+пропуск|вставьте\s+пропуск|вставьте\s+значение|укажите\s+в\s+пропуск/i.test(
      lower,
    ) ||
    /_{3,}/.test(text) ||
    /\\text\{\s*_{2,}\s*\}/.test(text) ||
    /\\underline/.test(text) ||
    /\.{4,}/.test(text) ||
    /=\s*[^?\n]{0,120}_{2,}/.test(text)
  );
}

function rewriteFillInBlankQuestion(text: string): string | null {
  const body = text
    .replace(/заполните\s+пропуск[:\s]*/gi, "")
    .replace(/вставьте\s+пропуск[:\s]*/gi, "")
    .trim();

  const formula =
    body.match(/\$([^$]+)\$/)?.[1]?.replace(/\\text\{\s*_{2,}\s*\}/g, "").trim() ??
    body.replace(/_{2,}/g, "").replace(/\\text\{[^}]*\}/g, "").trim();

  if (!formula || formula.length < 3) return null;

  if (/\([^)]+\)\^|\)\^/.test(formula)) {
    return `Какое свойство степени выражено в равенстве $${formula}$?`;
  }

  if (/\^/.test(formula)) {
    return `Какое правило степеней описывает равенство $${formula}$?`;
  }

  return `Как сформулировать правило для выражения $${formula}$ по материалу?`;
}

function buildQaTitle(markdown: string): string {
  const heading =
    markdown.match(/^#\s+(.+)$/m)?.[1]?.replace(/\*+/g, "").trim() ?? "";
  if (!heading) return "# Вопросы";
  if (/^вопросы(?:\s+по|\s*$)/i.test(heading)) return `# ${heading}`;
  return `# Вопросы по теме «${heading}»`;
}
