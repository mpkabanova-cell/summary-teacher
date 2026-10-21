import { describe, expect, it } from "vitest";
import { COURSES, SUBJECTS, gradesForSubject, getCourse, canGenerateMaterial } from "@/lib/lesson-directory";
import { getLessonDetails } from "@/lib/server/lesson-details";
import { buildSystemPrompt } from "@/lib/server/prompt";
import { DEFAULT_SETTINGS } from "@/lib/summary-types";

describe("Subject directories", () => {
  it("offers the four subjects with the requested grades", () => {
    expect(SUBJECTS.sort()).toEqual(["Биология", "Математика", "Русский язык", "Физика"]);
    expect(gradesForSubject("Русский язык")).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(gradesForSubject("Физика")).toEqual([7, 8, 9, 10, 11]);
    expect(gradesForSubject("Биология")).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(gradesForSubject("Математика")).toEqual([6]);
  });
  it("gives every test work a named topic", () => {
    for (const course of COURSES) for (const lesson of course.lessons) {
      if (/^(Итоговая )?Контрольная работа( № \d+)?$|^Всероссийская проверочная работа$|^Контрольная итоговая работа$/.test(lesson.title)) {
        throw new Error(`${course.id} № ${lesson.number} has no name: ${lesson.title}`);
      }
    }
    expect(getCourse("math-6")!.lessons[20]!.title).toContain("Контрольная работа № 1 по");
  });
  it("resolves lessons within the chosen course", () => {
    expect(canGenerateMaterial(0, 200, "russian-6")).toBe(true);
    expect(canGenerateMaterial(0, 200, "physics-7")).toBe(false);
    expect(getLessonDetails(1, "physics-7")?.title).toContain("Физика");
  });
  it("never prints the lesson type and applies goal rules", () => {
    const prompt = buildSystemPrompt({ ...DEFAULT_SETTINGS, courseId: "physics-7", lessonNumber: 1 }, 0);
    expect(prompt).not.toContain("урок открытия нового знания");
    expect(prompt).toContain("ПРАВИЛА ФОРМУЛИРОВКИ ЦЕЛИ УРОКА");
    expect(prompt).toContain("предмет «Физика», 7 класс");
  });
});
