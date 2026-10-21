import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, MATERIAL_POLICY, MATERIAL_SECTIONS, normalizeSummarySettings } from "@/lib/summary-types";
import { canGenerateMaterial } from "@/lib/lesson-directory";

describe("Topic-only material bundle", () => {
  it("always creates all four teaching roles together", () => {
    expect(DEFAULT_SETTINGS.format).toBe("bundle");
    expect(MATERIAL_POLICY.allSections).toBe(true);
    expect(MATERIAL_SECTIONS.map((section) => section.role)).toEqual(["theory", "procedure", "practice", "retrieval"]);
    expect(normalizeSummarySettings({ ...DEFAULT_SETTINGS, format: "table" }).format).toBe("bundle");
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