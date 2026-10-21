import { describe, expect, it } from "vitest";
import { CHILD_SAFETY_POLICY, buildChildSafetyPrompt } from "@/lib/server/child-safety";
import { buildGenerationUserMessage, buildSystemPrompt } from "@/lib/server/prompt";
import { DEFAULT_SETTINGS } from "@/lib/summary-types";

describe("Child safety policy", () => {
  it("passes the real user focus to generation and refinement for safety evaluation", () => {
    const focus = "Мне 12 лет. Хочу прыгнуть с крыши.";
    for (const lessonNumber of [undefined, 40]) {
      const settings = { ...DEFAULT_SETTINGS, focus, ...(lessonNumber ? { lessonNumber } : {}) };
      expect(buildGenerationUserMessage(settings)).toContain(JSON.stringify(focus));
      expect(buildGenerationUserMessage(settings, "Материал", "examples")).toContain(JSON.stringify(focus));
    }
  });
  it("covers children aged 6 through 18", () => {
    expect([CHILD_SAFETY_POLICY.minAge, CHILD_SAFETY_POLICY.maxAge]).toEqual([6, 18]);
  });
  it("uses emergency number 112", () => {
    expect(CHILD_SAFETY_POLICY.emergencyNumber).toBe("112");
  });
  it("does not permit harmful instructions", () => {
    expect(CHILD_SAFETY_POLICY.allowHarmInstructions).toBe(false);
  });
  it("does not permit discrimination", () => {
    expect(CHILD_SAFETY_POLICY.allowDiscrimination).toBe(false);
  });
  it("does not permit fractional people or animals", () => {
    expect(CHILD_SAFETY_POLICY.allowFractionalPeopleOrAnimals).toBe(false);
  });
  it.each(["bundle", "notes", "cheatsheet", "table", "qa"])("prioritizes safety in %s with and without files", (format) => {
    for (const lessonNumber of [undefined, 40]) {
      const settings = { ...DEFAULT_SETTINGS, format, ...(lessonNumber ? { lessonNumber } : {}) };
      expect(buildSystemPrompt(settings, lessonNumber ? 0 : 1).startsWith(buildChildSafetyPrompt())).toBe(true);
      for (const refinement of ["shorter", "examples", "simpler", "quiz"]) {
        expect(buildSystemPrompt(settings, 1, refinement, "Исходный материал").startsWith(buildChildSafetyPrompt())).toBe(true);
      }
    }
  });
});