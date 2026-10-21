import lessonData from "@/data/math-grade-6.json";

export interface Lesson {
  number: number;
  section: string;
  hours: number;
  title: string;
  type: string;
  concepts: string;
  newConcepts: string | null;
  goal: string;
  outcomes: string;
  context: string;
  quarter: string;
  week: number;
  dates: string[];
}

export const LESSONS: Lesson[] = lessonData;
export const SUBJECT = "Математика";
export const GRADE = 6;
export const CURRICULUM_URL = "https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_matematika-5-9_baza.pdf";

export function getMoscowDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function nearestLessonIndex(lessons: Lesson[], today = getMoscowDate()): number {
  const target = Date.parse(today);
  let best = -1;
  let distance = Infinity;
  lessons.forEach((lesson, index) => {
    const candidate = Math.min(...lesson.dates.map((date) => Math.abs(Date.parse(date) - target)));
    if (candidate < distance) { best = index; distance = candidate; }
  });
  return best;
}

export function lessonNeighborhood(lessons: Lesson[], index: number): Lesson[] {
  return index < 0 ? [] : lessons.slice(Math.max(0, index - 3), index + 4);
}

export function searchLessons(query: string): Lesson[] {
  const words = query.toLocaleLowerCase("ru").replaceAll("ё", "е").trim().split(/\s+/);
  return LESSONS.filter((lesson) => {
    const text = `${lesson.number} ${lesson.section} ${lesson.title} ${lesson.concepts}`.toLocaleLowerCase("ru").replaceAll("ё", "е");
    return words.every((word) => text.includes(word));
  });
}

export function getSelectedLesson(number?: number): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.number === number);
}

export function canGenerateMaterial(imageCount: number, lessonNumber?: number): boolean {
  return imageCount > 0 || Boolean(getSelectedLesson(lessonNumber));
}

export function formatLessonDate(date: string): string {
  return date.split("-").reverse().join(".");
}