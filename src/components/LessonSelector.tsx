import { useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_COURSE_ID, SUBJECTS, findCourse, getCourse, getSelectedLesson, gradesForSubject, nearestLessonIndex, searchLessons } from "@/lib/lesson-directory";

export function LessonSelector({ courseId = DEFAULT_COURSE_ID, lessonNumber, onChange, onCourseChange, disabled }: {
  courseId?: string | undefined; lessonNumber?: number | undefined; onChange: (number?: number) => void;
  onCourseChange: (courseId: string) => void; disabled: boolean;
}) {
  const course = getCourse(courseId) ?? getCourse()!;
  const lessons = course.lessons;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [nearestIndex, setNearestIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = getSelectedLesson(lessonNumber, course.id);
  const results = searchLessons(query, course.id);
  const closest = lessons[nearestIndex];

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) { setQuery(""); setNearestIndex(nearestLessonIndex(lessons)); }
  }

  return (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
        <div className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>Предмет</span>
          <Select value={course.subject} disabled={disabled} onValueChange={(subject) => {
            const next = findCourse(subject, gradesForSubject(subject)[0]!);
            if (next) onCourseChange(next.id);
          }}>
            <SelectTrigger aria-label="Предмет" className="h-9 bg-card text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-0">
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>Класс</span>
          <Select value={String(course.grade)} disabled={disabled} onValueChange={(grade) => {
            const next = findCourse(course.subject, Number(grade));
            if (next) onCourseChange(next.id);
          }}>
            <SelectTrigger aria-label="Класс" className="h-9 bg-card text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-0">
              {gradesForSubject(course.subject).map((g) => <SelectItem key={g} value={String(g)}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Тема урока</p>
        <div className="flex min-w-0 items-center gap-2">
          <Popover open={open} onOpenChange={changeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={disabled} role="combobox" aria-expanded={open}
                aria-label="Тема урока"
                className="h-auto min-h-11 min-w-0 flex-1 justify-between whitespace-normal bg-card text-left">
                <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 break-words">{selected ? `№ ${selected.number} · ${selected.title}` : "Выбрать тему урока"}</span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={6} aria-describedby={undefined}
              className="lesson-dialog w-[var(--radix-popover-trigger-width)] min-w-0 max-w-[calc(100vw-1.5rem)] gap-3 rounded-lg p-3"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                const list = listRef.current;
                const row = list?.querySelector<HTMLButtonElement>(`[data-lesson="${closest?.number}"]`);
                if (!list || !row) return;
                row.focus({ preventScroll: true });
                list.scrollTop = Math.max(0, nearestIndex - 3) * row.offsetHeight;
              }}>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input aria-label="Поиск по темам и номерам уроков" placeholder="Поиск темы или номера урока" value={query}
                  onChange={(event) => { setQuery(event.target.value); if (listRef.current) listRef.current.scrollTop = 0; }} className="pl-9" />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{query ? `Найдено: ${results.length}` : `${lessons.length} уроков · 2026–2027`}</span>
                {!query && closest && <span>Ближайший: № {closest.number}</span>}
              </div>
              <div ref={listRef} className="lesson-list overflow-y-auto rounded-md border border-border" role="group" aria-label="Темы уроков">
                {results.map((lesson) => (
                  <Button key={lesson.number} data-lesson={lesson.number} variant="ghost" onClick={() => { onChange(lesson.number); changeOpen(false); }}
                    aria-pressed={lessonNumber === lesson.number}
                    className={`lesson-row flex w-full justify-start gap-2 rounded-none border-b border-border px-3 py-1 text-left whitespace-normal ${lesson.number === closest?.number && !query ? "bg-secondary text-secondary-foreground" : ""}`}>
                    <span className="w-9 shrink-0 text-xs font-semibold">№ {lesson.number}</span>
                    <span className="min-w-0 flex-1"><span className="line-clamp-2 text-xs leading-4">{lesson.title}</span></span>
                    {lessonNumber === lesson.number && <Check className="h-3 w-3 shrink-0 text-primary" />}
                  </Button>
                ))}
                {!results.length && <p className="p-6 text-center text-sm text-muted-foreground">Темы не найдены</p>}
              </div>
            </PopoverContent>
          </Popover>
          {selected && <Button variant="ghost" size="icon" disabled={disabled} onClick={() => onChange(undefined)} aria-label="Убрать выбранную тему" title="Убрать выбранную тему"><X className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  );
}
