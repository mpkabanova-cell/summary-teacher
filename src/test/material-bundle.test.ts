import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  MATERIAL_BLOCK_ORDER,
  MATERIAL_POLICY,
  MATERIAL_SECTIONS,
  assembleMaterialContent,
  normalizeSummarySettings,
  splitMaterialSections,
} from "@/lib/summary-types";
import { buildBlockSystemPrompt, buildBlockUserMessage } from "@/lib/server/prompt";
import { canGenerateMaterial } from "@/lib/lesson-directory";

describe("Topic-only material bundle", () => {
  it("always creates all four teaching roles together", () => {
    expect(DEFAULT_SETTINGS.format).toBe("bundle");
    expect(MATERIAL_POLICY.allSections).toBe(true);
    expect(MATERIAL_SECTIONS.map((section) => section.role)).toEqual(["theory", "procedure", "retrieval", "practice"]);
    expect(MATERIAL_BLOCK_ORDER).toEqual(MATERIAL_SECTIONS.map((section) => section.id));
    expect(normalizeSummarySettings({ ...DEFAULT_SETTINGS, format: "table" }).format).toBe("bundle");
  });
  it("uses the spec section titles", () => {
    expect(MATERIAL_SECTIONS.map((section) => section.title)).toEqual([
      "Опорный конспект",
      "Памятка и алгоритм",
      "Материал для повторения и систематизации",
      "Пример домашнего задания",
    ]);
  });
  it("defaults detail to medium", () => {
    expect(DEFAULT_SETTINGS.detail).toBe("medium");
  });
  it("defaults explanation style to study", () => {
    expect(DEFAULT_SETTINGS.level).toBe("study");
  });
  it("disallows diagrams", () => {
    expect(MATERIAL_POLICY.allowDiagrams).toBe(false);
  });
  it("does not allow duplicate theory or exercises", () => {
    expect(MATERIAL_POLICY.duplicateTheory).toBe(false);
    expect(MATERIAL_POLICY.duplicateExercises).toBe(false);
    expect(MATERIAL_SECTIONS.filter((section) => section.workedExamples).map((section) => section.id)).toEqual(["notes"]);
  });
  it("limits the lesson objective to the supporting notes", () => {
    expect(MATERIAL_SECTIONS.filter((section) => section.objective).map((section) => section.id)).toEqual(["notes"]);
  });
  it("requires a valid topic even when old uploaded files exist", () => {
    expect(canGenerateMaterial(6)).toBe(false);
    expect(canGenerateMaterial(0, 38)).toBe(true);
  });
});

describe("Block assembly and splitting", () => {
  const blocks = {
    notes: "Теория по теме.",
    algorithms: "Шаги решения.",
    review: "Обобщающая таблица.",
    homework: "Задания и ответы.",
  };
  it("assembles blocks in canonical order with section headings", () => {
    const content = assembleMaterialContent(blocks);
    const notesPos = content.indexOf("## Опорный конспект");
    const algorithmsPos = content.indexOf("## Памятка и алгоритм");
    const reviewPos = content.indexOf("## Материал для повторения и систематизации");
    const homeworkPos = content.indexOf("## Пример домашнего задания");
    expect(notesPos).toBeGreaterThanOrEqual(0);
    expect(notesPos).toBeLessThan(algorithmsPos);
    expect(algorithmsPos).toBeLessThan(reviewPos);
    expect(reviewPos).toBeLessThan(homeworkPos);
  });
  it("strips a duplicated section heading inside a block body", () => {
    const content = assembleMaterialContent({ notes: "## Опорный конспект\n\nТеория." });
    expect(content.match(/Опорный конспект/g)).toHaveLength(1);
  });
  it("strips a duplicated lesson topic heading after the section heading", () => {
    const content = assembleMaterialContent(
      { review: "## Систематизация знаний о выразительных средствах\n\nОбобщающая таблица." },
      "Систематизация знаний о выразительных средствах",
    );
    expect(content.match(/Систематизация знаний о выразительных средствах/g)).toBeNull();
    expect(content).toContain("Обобщающая таблица.");
  });
  it("keeps a leading heading that is not the section title or the topic", () => {
    const content = assembleMaterialContent(
      { notes: "### Цель урока\n\nНаучиться складывать дроби." },
      "Сложение дробей",
    );
    expect(content).toContain("### Цель урока");
  });
  it("round-trips assembled content back into blocks", () => {
    const sections = splitMaterialSections(assembleMaterialContent(blocks));
    expect(sections).toEqual(blocks);
  });
  it("keeps unknown subsections inside the preceding block", () => {
    const content = `${assembleMaterialContent(blocks).replace("Обобщающая таблица.", "Таблица.\n\n## Предположительные ответы\n\n1. Ответ.")}`;
    const sections = splitMaterialSections(content);
    expect(sections?.review).toContain("Предположительные ответы");
    expect(sections?.homework).toBe("Задания и ответы.");
  });
  it("returns null for content without section headings", () => {
    expect(splitMaterialSections("Просто текст без разделов.")).toBeNull();
  });
});

describe("Block prompts follow the spec", () => {
  const settings = { ...DEFAULT_SETTINGS, lessonNumber: 38 };
  it("shares the common requirements across all blocks", () => {
    for (const blockId of MATERIAL_BLOCK_ORDER) {
      const prompt = buildBlockSystemPrompt(settings, blockId);
      expect(prompt).toContain("Не добавляй общие методические фразы");
      expect(prompt).toContain("Схемы запрещены");
      expect(prompt).toContain("не дублируй раскрытое в них содержание");
    }
  });
  it("gives each block its own teaching function", () => {
    expect(buildBlockSystemPrompt(settings, "notes")).toContain("Что нужно понять и знать по теме?");
    expect(buildBlockSystemPrompt(settings, "notes")).toContain("Цель урока");
    expect(buildBlockSystemPrompt(settings, "algorithms")).toContain("Как действовать и применять?");
    expect(buildBlockSystemPrompt(settings, "review")).toContain("Как связать, сравнить, обобщить и проверить изученное?");
    expect(buildBlockSystemPrompt(settings, "homework")).toContain("Ответы для самопроверки");
  });
  it("keeps the lesson objective out of non-notes blocks", () => {
    for (const blockId of ["algorithms", "review", "homework"]) {
      expect(buildBlockSystemPrompt(settings, blockId)).toContain("Не выводи цель урока");
    }
  });
  it("passes other blocks as context and never the block itself", () => {
    const message = buildBlockUserMessage(settings, "algorithms", {
      notes: "Текст конспекта",
      algorithms: "Старые шаги",
      review: "Текст повторения",
    });
    expect(message).toContain("Текст конспекта");
    expect(message).toContain("Текст повторения");
    expect(message).not.toContain("Старые шаги");
  });
});
