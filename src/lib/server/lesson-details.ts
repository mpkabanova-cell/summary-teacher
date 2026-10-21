import type { Lesson } from "@/lib/lesson-directory";
import { DEFAULT_COURSE_ID } from "@/lib/lesson-directory";

const files = import.meta.glob<Lesson[]>("../../data/courses/*.json", { eager: true, import: "default" });
const byCourse = new Map<string, Lesson[]>(
  Object.entries(files).map(([path, lessons]) => [path.split("/").pop()!.replace(".json", ""), lessons]),
);

export function getLessonDetails(number?: number, courseId: string = DEFAULT_COURSE_ID): Lesson | undefined {
  return byCourse.get(courseId)?.find((lesson) => lesson.number === number);
}
