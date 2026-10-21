import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/summary-types";
import { buildGenerationUserMessage, buildSystemPrompt } from "@/lib/server/prompt";

describe("Curriculum generation source rules", () => {
  it("resolves the selected lesson's original goal and grade as grounding", () => {
    const prompt = buildSystemPrompt({ ...DEFAULT_SETTINGS, lessonNumber: 38 }, 0);
    expect(prompt).toContain("6 класс, урок № 38");
    expect(prompt).toContain("Сравнение и упорядочивание дробей. Сложение и вычитание обыкновенных дробей");
    expect(prompt).toContain("федеральной рабочей программой");
    expect(prompt).toContain("Файл необязателен");
    expect(prompt).not.toContain("Используй только информацию, которую можно увидеть");
    expect(buildGenerationUserMessage({ ...DEFAULT_SETTINGS, lessonNumber: 38 })).toContain("уроку № 38");
  });
  it("preserves strict uploaded-page grounding when no lesson is selected", () => {
    expect(buildSystemPrompt(DEFAULT_SETTINGS, 1)).toContain("Используй только информацию, которую можно увидеть");
  });
  it("keeps deep explanations within the sixth-grade program", () => {
    const prompt = buildSystemPrompt({ ...DEFAULT_SETTINGS, lessonNumber: 38, level: "deep" }, 0);
    expect(prompt).toContain("внутри программы 6 класса");
    expect(prompt).not.toContain("только в пределах исходных страниц");
  });
});