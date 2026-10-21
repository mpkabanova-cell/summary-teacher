import { describe, expect, it } from "vitest";
import { LESSONS, canGenerateMaterial, getMoscowDate, lessonNeighborhood, nearestLessonIndex, searchLessons } from "@/lib/lesson-directory";

describe("Lesson directory", () => {
  it("preserves the 170 numbered lessons in the uploaded directory", () => {
    expect(LESSONS.map((lesson) => lesson.number)).toEqual(Array.from({ length: 170 }, (_, i) => i + 1));
  });
  it("focuses the lesson nearest the real date, not a fixed default", () => {
    expect(LESSONS[nearestLessonIndex(LESSONS, "2026-10-21")]?.number).toBe(38);
    expect(LESSONS[nearestLessonIndex(LESSONS, "2026-09-01")]?.number).toBe(1);
  });
  it("shows three previous and three next lessons around lesson 38", () => {
    expect(lessonNeighborhood(LESSONS, 37).map((lesson) => lesson.number)).toEqual([35, 36, 37, 38, 39, 40, 41]);
  });
  it("uses every allowed date rather than only the first one", () => {
    expect(LESSONS[nearestLessonIndex(LESSONS, "2026-11-03")]?.number).toBe(41);
  });
  it("uses Moscow's current calendar day near midnight", () => {
    expect(getMoscowDate(new Date("2026-10-20T21:30:00Z"))).toBe("2026-10-21");
  });
  it("allows a selected lesson without any file", () => {
    expect(canGenerateMaterial(0, 38)).toBe(true);
    expect(canGenerateMaterial(0)).toBe(false);
    expect(canGenerateMaterial(0, 999)).toBe(false);
    expect(canGenerateMaterial(1)).toBe(false);
  });
  it("searches lesson numbers and topic words", () => {
    expect(searchLessons("38").map((lesson) => lesson.number)).toContain(38);
    expect(searchLessons("процент").some((lesson) => lesson.number === 5)).toBe(true);
    expect(searchLessons("неизвестная тема")).toHaveLength(0);
  });
});