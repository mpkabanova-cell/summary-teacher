import courseIndex from "@/data/course-index.json";

export interface LessonSummary {
  number: number;
  title: string;
  section: string;
  concepts: string;
  dates: string[];
}

export interface Lesson extends LessonSummary {
  hours: number;
  type: string;
  newConcepts: string | null;
  goal: string;
  outcomes: string;
  context: string;
  quarter: string;
  week: number;
}

export interface Course {
  id: string;
  subject: string;
  grade: number;
  lessons: LessonSummary[];
}

export const COURSES: Course[] = courseIndex;
export const DEFAULT_COURSE_ID = "math-6";
export const SUBJECTS = [...new Set(COURSES.map((course) => course.subject))];

export const CURRICULUM_URLS: Record<string, string> = {
  "Математика": "https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_matematika-5-9_baza.pdf",
};

export function getCourse(courseId: string = DEFAULT_COURSE_ID): Course | undefined {
  return COURSES.find((course) => course.id === courseId);
}

export function gradesForSubject(subject: string): number[] {
  return COURSES.filter((course) => course.subject === subject).map((course) => course.grade).sort((a, b) => a - b);
}

export function findCourse(subject: string, grade: number): Course | undefined {
  return COURSES.find((course) => course.subject === subject && course.grade === grade);
}

/** Lessons of the default course (Математика · 6 класс). */
export const LESSONS: LessonSummary[] = getCourse()!.lessons;

export function getMoscowDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function nearestLessonIndex(lessons: LessonSummary[], today = getMoscowDate()): number {
  const target = Date.parse(today);
  let best = -1;
  let distance = Infinity;
  lessons.forEach((lesson, index) => {
    const candidate = Math.min(...lesson.dates.map((date) => Math.abs(Date.parse(date) - target)));
    if (candidate < distance) { best = index; distance = candidate; }
  });
  return best;
}

export function lessonNeighborhood<T>(lessons: T[], index: number): T[] {
  return index < 0 ? [] : lessons.slice(Math.max(0, index - 3), index + 4);
}

export function searchLessons(query: string, courseId: string = DEFAULT_COURSE_ID): LessonSummary[] {
  const words = query.toLocaleLowerCase("ru").replaceAll("ё", "е").trim().split(/\s+/);
  return (getCourse(courseId)?.lessons ?? []).filter((lesson) => {
    const text = `${lesson.number} ${lesson.section} ${lesson.title} ${lesson.concepts}`.toLocaleLowerCase("ru").replaceAll("ё", "е");
    return words.every((word) => text.includes(word));
  });
}

export function getSelectedLesson(number?: number, courseId: string = DEFAULT_COURSE_ID): LessonSummary | undefined {
  return getCourse(courseId)?.lessons.find((lesson) => lesson.number === number);
}

export function canGenerateMaterial(imageCount: number, lessonNumber?: number, courseId: string = DEFAULT_COURSE_ID): boolean {
  return Boolean(getSelectedLesson(lessonNumber, courseId));
}

export function formatLessonDate(date: string): string {
  return date.split("-").reverse().join(".");
}
