import { createServer } from "vite";

const cases = [
  {
    name: "removes common Russian preamble",
    input:
      "Конечно, вот конспект по свойствам степеней с рациональным показателем:\n\n# Свойства степеней",
    expected: "# Свойства степеней",
  },
  {
    name: "removes preamble after refinement separator",
    input:
      "# База\n\n---\n\nВот дополнительные примеры:\n\n- $a^n \\cdot a^m$",
    expected: "# База\n\n---\n\n- $a^n \\cdot a^m$",
  },
  {
    name: "removes greeting intro and study outro",
    input:
      "Привет! Давай разберёмся со свойствами степеней. Это важная тема в математике, которая поможет тебе решать много задач.\n\n# Свойства степеней\n\n- $a^n \\cdot a^m = a^{n+m}$\n\nНадеюсь, это поможет тебе лучше понять свойства степеней! Удачи в учёбе!",
    expected:
      "# Свойства степеней\n\n- $a^n \\cdot a^m = a^{n+m}$",
  },
  {
    name: "qa mode keeps only numbered questions",
    format: "qa",
    input: `# Степени с рациональным показателем

## Теория в двух словах

При работе со степенями основания должны быть положительными.

## Карточки для самопроверки

### Карточка 1

**Вопрос:** Какое ограничение накладывается на основания $a$ и $b$?

**Ответ:** Основания должны быть **положительными числами**.

### Карточка 2

**Вопрос:** Как сложить степени с одним основанием?

**Ответ:** $a^p \\cdot a^q = a^{p+q}$

**Пример:** $2^{1/2} \\cdot 2^{3/2} = 4$`,
    expectedIncludes: [
      "# Вопросы по теме «Степени с рациональным показателем»",
      "1. Какое ограничение накладывается на основания",
      "2. Как сложить степени с одним основанием",
    ],
    expectedExcludes: [
      "| № | Вопрос |",
      "Теория",
      "**Ответ:**",
      "**Пример:**",
      "Карточка",
      "положительными числами",
      "a^{p+q}",
    ],
  },
  {
    name: "qa mode rewrites fill in the blank",
    format: "qa",
    input: `# Вопросы

| № | Вопрос |
|---|--------|
| 3 | Заполните пропуск: $(y^p)^q = y^{\\text{___}}$ |`,
    expectedIncludes: ["1. Какое свойство степени", "?"],
    expectedExcludes: ["| № | Вопрос |", "Заполните пропуск", "___", "\\text{___}"],
  },
  {
    name: "qa mode removes duplicate question labels",
    format: "qa",
    input: `# Вопросы

1. Какое правило применяется при умножении степеней с одинаковым основанием $a^p \\cdot a^q$?
2. **Вопрос:** Какое правило применяется при умножении степеней с одинаковым основанием $a^p \\cdot a^q$?`,
    expected:
      "# Вопросы\n\n1. Какое правило применяется при умножении степеней с одинаковым основанием $a^p \\cdot a^q$?\n",
  },
  {
    name: "qa mode hides konspekt draft without questions",
    format: "qa",
    input: `# Свойства степеней

**Важно:** основания $a$ и $b$ положительны.

## Основные свойства

1. Умножение степеней с одинаковым основанием: $a^p \\cdot a^q = a^{p+q}$.`,
    expected: "",
  },
  {
    name: "qa mode strips mermaid blocks",
    format: "qa",
    input: `# Вопросы

\`\`\`mermaid
flowchart TD
A[Начало] --> B[Конец]
\`\`\`

1. Какое свойство выражает $a^p \\cdot a^q = a^{p+q}$?`,
    expected:
      "# Вопросы\n\n1. Какое свойство выражает $a^p \\cdot a^q = a^{p+q}$?\n",
  },
  {
    name: "all formats strip mermaid",
    format: "notes",
    input: `# Тема

\`\`\`mermaid
flowchart TD
A --> B
\`\`\`

Текст после схемы.`,
    expected: "# Тема\n\nТекст после схемы.",
  },
  {
    name: "qa mode extracts bullet questions",
    format: "qa",
    input: `# Вопросы

- Какое ограничение накладывается на основание степени?
- Что означает рациональный показатель?
- Ответ: это не вопрос и не должен попасть в список.`,
    expected:
      "# Вопросы\n\n1. Какое ограничение накладывается на основание степени?\n2. Что означает рациональный показатель?\n",
  },
  {
    name: "qa mode ignores bullet notes without questions",
    format: "qa",
    input: `# Свойства степеней

- Основания должны быть положительными.
- Основные свойства помогают преобразовывать выражения.`,
    expected: "",
  },
];

const server = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
});

try {
  const { removeModelPreamble, cleanSummaryContent } =
    await server.ssrLoadModule("/src/lib/summary-cleanup.ts");

  for (const item of cases) {
    const actual = item.format
      ? cleanSummaryContent(item.input, item.format)
      : removeModelPreamble(item.input);

    if (item.expected !== undefined && actual !== item.expected) {
      throw new Error(
        `${item.name}: unexpected cleanup\nExpected:\n${item.expected}\nActual:\n${actual}`,
      );
    }

    for (const fragment of item.expectedIncludes ?? []) {
      if (!actual.includes(fragment)) {
        throw new Error(
          `${item.name}: missing fragment "${fragment}"\n${actual}`,
        );
      }
    }

    for (const fragment of item.expectedExcludes ?? []) {
      if (actual.includes(fragment)) {
        throw new Error(
          `${item.name}: forbidden fragment "${fragment}"\n${actual}`,
        );
      }
    }
  }

  console.log(`Summary cleanup checks passed (${cases.length} cases).`);
} finally {
  await server.close();
}
